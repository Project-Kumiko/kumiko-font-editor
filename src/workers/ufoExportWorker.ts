/// <reference lib="webworker" />

import { hashString } from '../lib/hash'
import { serializeGlifRecord, serializeXmlPlist, pickDefaultLayer } from '../lib/ufoFormat'
import {
  listDirtyUfoGlyphs,
  listUfoGlyphsInLayer,
  listUfoMetadataForProject,
  loadUfoProject,
  updateUfoGlyphExportState,
} from '../lib/ufoPersistence'
import type { UfoLocalSaveManifest } from '../lib/ufoTypes'

interface UfoExportRequestMessage {
  type: 'export-ufo'
  payload: {
    projectId: string
    rootHandle: FileSystemDirectoryHandle
    exportAll?: boolean
    markClean?: boolean
    fixedConcurrency?: number
    localManifest?: UfoLocalSaveManifest | null
  }
}

interface UfoExportProgressMessage {
  type: 'export-progress'
  payload: {
    completed: number
    total: number
  }
}

interface UfoExportSuccessMessage {
  type: 'export-success'
  payload: {
    writtenGlyphs: number
    skippedGlyphs: number
    totalGlyphs: number
    didFullRebuild: boolean
    manifest: UfoLocalSaveManifest
  }
}

interface UfoExportErrorMessage {
  type: 'export-error'
  payload: {
    message: string
  }
}

type UfoExportResponseMessage =
  | UfoExportProgressMessage
  | UfoExportSuccessMessage
  | UfoExportErrorMessage

const writeTextFile = async (
  directory: FileSystemDirectoryHandle,
  name: string,
  content: string
) => {
  const fileHandle = await directory.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

const readRelativeFileText = async (
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string
) => {
  const segments = relativePath.split('/').filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  let directoryHandle = rootHandle
  for (let index = 0; index < segments.length - 1; index += 1) {
    directoryHandle = await directoryHandle.getDirectoryHandle(segments[index]!, {
      create: false,
    })
  }

  const fileHandle = await directoryHandle.getFileHandle(segments[segments.length - 1]!, {
    create: false,
  })
  const file = await fileHandle.getFile()
  return file.text()
}

const hasLocalDiverged = async (
  rootHandle: FileSystemDirectoryHandle,
  manifest: UfoLocalSaveManifest | null | undefined
) => {
  if (!manifest || Object.keys(manifest.files).length === 0) {
    return true
  }

  for (const [relativePath, expectedHash] of Object.entries(manifest.files)) {
    try {
      const text = await readRelativeFileText(rootHandle, relativePath)
      if (text === null || hashString(text) !== expectedHash) {
        return true
      }
    } catch {
      return true
    }
  }

  return false
}

self.onmessage = async (event: MessageEvent<UfoExportRequestMessage>) => {
  if (event.data?.type !== 'export-ufo') {
    return
  }

  try {
    const {
      projectId,
      rootHandle,
      exportAll = false,
      markClean = true,
      fixedConcurrency = 8,
      localManifest = null,
    } = event.data.payload
    const project = await loadUfoProject(projectId)
    if (!project) {
      throw new Error('找不到 UFO 專案')
    }

    const metadataRecords = await listUfoMetadataForProject(projectId)
    const dirtyGlyphs = await listDirtyUfoGlyphs(projectId)
    const dirtyKeySet = new Set(
      dirtyGlyphs.map((glyph) => `${glyph.projectId}::${glyph.ufoId}::${glyph.layerId}::${glyph.glyphName}`)
    )
    const localChanged = await hasLocalDiverged(rootHandle, localManifest)
    const shouldFullRebuild = exportAll || localChanged
    let totalTargetGlyphs = shouldFullRebuild ? 0 : dirtyGlyphs.length
    let completedTargetGlyphs = 0
    let writtenGlyphs = 0
    let skippedGlyphs = 0
    const concurrency = Math.max(1, fixedConcurrency)
    const manifest: UfoLocalSaveManifest = { files: {} }

    const exportStateUpdates: Array<{
      key: [string, string, string, string]
      dirty: boolean
      sourceHash: string | null
    }> = []

    for (const metadata of metadataRecords) {
      const ufoHandle = await rootHandle.getDirectoryHandle(metadata.relativePath, { create: true })
      const defaultLayer = pickDefaultLayer(metadata)
      const defaultLayerGlyphs = await listUfoGlyphsInLayer(projectId, metadata.ufoId, defaultLayer.layerId)

      const metadataWrites: Array<Promise<void>> = [
        (() => {
          const relativePath = `${metadata.relativePath}/metainfo.plist`
          const content = serializeXmlPlist({
            creator: metadata.metainfo?.creator ?? 'org.kumiko.fonteditor',
            formatVersion: metadata.metainfo?.formatVersion ?? 3,
            formatVersionMinor: metadata.metainfo?.formatVersionMinor ?? 0,
          })
          manifest.files[relativePath] = hashString(content)
          return writeTextFile(ufoHandle, 'metainfo.plist', content)
        })(),
        (() => {
          const relativePath = `${metadata.relativePath}/fontinfo.plist`
          const content = serializeXmlPlist(metadata.fontinfo ?? {})
          manifest.files[relativePath] = hashString(content)
          return writeTextFile(ufoHandle, 'fontinfo.plist', content)
        })(),
        (() => {
          const relativePath = `${metadata.relativePath}/lib.plist`
          const content = serializeXmlPlist(metadata.lib ?? {})
          manifest.files[relativePath] = hashString(content)
          return writeTextFile(ufoHandle, 'lib.plist', content)
        })(),
        (() => {
          const relativePath = `${metadata.relativePath}/groups.plist`
          const content = serializeXmlPlist(metadata.groups ?? {})
          manifest.files[relativePath] = hashString(content)
          return writeTextFile(ufoHandle, 'groups.plist', content)
        })(),
        (() => {
          const relativePath = `${metadata.relativePath}/kerning.plist`
          const content = serializeXmlPlist(metadata.kerning ?? {})
          manifest.files[relativePath] = hashString(content)
          return writeTextFile(ufoHandle, 'kerning.plist', content)
        })(),
        (() => {
          const relativePath = `${metadata.relativePath}/layercontents.plist`
          const content = serializeXmlPlist(metadata.layers.map((layer) => [layer.layerId, layer.glyphDir]))
          manifest.files[relativePath] = hashString(content)
          return writeTextFile(ufoHandle, 'layercontents.plist', content)
        })(),
      ]
      if (metadata.featuresText !== null) {
        const relativePath = `${metadata.relativePath}/features.fea`
        manifest.files[relativePath] = hashString(metadata.featuresText)
        metadataWrites.push(writeTextFile(ufoHandle, 'features.fea', metadata.featuresText))
      }
      await Promise.all(metadataWrites)

      for (const layer of metadata.layers) {
        const layerHandle = await ufoHandle.getDirectoryHandle(layer.glyphDir, { create: true })
        const layerGlyphs =
          layer.layerId === defaultLayer.layerId
            ? defaultLayerGlyphs
            : await listUfoGlyphsInLayer(projectId, metadata.ufoId, layer.layerId)

        const contents = Object.fromEntries(layerGlyphs.map((glyph) => [glyph.glyphName, glyph.fileName]))
        const contentsText = serializeXmlPlist(contents)
        manifest.files[`${metadata.relativePath}/${layer.glyphDir}/contents.plist`] = hashString(contentsText)
        await writeTextFile(layerHandle, 'contents.plist', contentsText)

        const targetLayerGlyphs = shouldFullRebuild
          ? layerGlyphs
          : layerGlyphs.filter((glyph) =>
              dirtyKeySet.has(`${glyph.projectId}::${glyph.ufoId}::${glyph.layerId}::${glyph.glyphName}`)
            )

        if (shouldFullRebuild) {
          totalTargetGlyphs += targetLayerGlyphs.length
        }

        let startIndex = 0
        while (startIndex < targetLayerGlyphs.length) {
          const batchGlyphs = targetLayerGlyphs.slice(
            startIndex,
            startIndex + Math.max(1, concurrency)
          )
          const batchResults = await Promise.all(
            batchGlyphs.map(async (glyph) => {
              const glifText = serializeGlifRecord(glyph)
              const nextHash = hashString(glifText)
              manifest.files[`${metadata.relativePath}/${layer.glyphDir}/${glyph.fileName}`] = nextHash
              const shouldWrite = shouldFullRebuild || glyph.sourceHash !== nextHash
              if (shouldWrite) {
                await writeTextFile(layerHandle, glyph.fileName, glifText)
              }

              return {
                key: [glyph.projectId, glyph.ufoId, glyph.layerId, glyph.glyphName] as [
                  string,
                  string,
                  string,
                  string,
                ],
                dirty: false,
                sourceHash: nextHash,
                didWrite: shouldWrite,
              }
            })
          )

          for (const result of batchResults) {
            if (markClean) {
              exportStateUpdates.push({
                key: result.key,
                dirty: result.dirty,
                sourceHash: result.sourceHash,
              })
            }
            if (result.didWrite) {
              writtenGlyphs += 1
            } else {
              skippedGlyphs += 1
            }
          }

          completedTargetGlyphs += batchGlyphs.length
          const progressMessage: UfoExportResponseMessage = {
            type: 'export-progress',
            payload: {
              completed: completedTargetGlyphs,
              total: totalTargetGlyphs,
            },
          }
          self.postMessage(progressMessage)
          startIndex += batchGlyphs.length
        }
      }
    }

    if (markClean) {
      await updateUfoGlyphExportState(exportStateUpdates)
    }

    const successMessage: UfoExportResponseMessage = {
      type: 'export-success',
      payload: {
        writtenGlyphs,
        skippedGlyphs,
        totalGlyphs: totalTargetGlyphs,
        didFullRebuild: shouldFullRebuild,
        manifest,
      },
    }
    self.postMessage(successMessage)
  } catch (error) {
    const message: UfoExportResponseMessage = {
      type: 'export-error',
      payload: {
        message: error instanceof Error ? error.message : 'UFO export worker failed',
      },
    }
    self.postMessage(message)
  }
}

export {}
