import {
  hydrateProjectFontData,
  getProjectArchiveMetadata,
  getProjectArchiveSourceFormat,
} from './projectArchive'
import { saveProject, loadProject } from './persistence'
import {
  loadUfoProject,
  saveUfoProject,
  saveUfoUiValue,
} from './ufoPersistence'
import { syncHotFontDataToUfoRecords } from './ufoFormat'
import type { FontData } from '../store'

export const UFO_LOCAL_DELETED_GLYPHS_KEY = 'ufo-local-deleted-glyph-ids'

export const saveDraftSnapshot = async (input: {
  projectId: string
  projectTitle: string
  fontData: FontData
  dirtyGlyphIds: string[]
  deletedGlyphIds: string[]
  selectedLayerId: string | null
}) => {
  const projectSourceFormat = getProjectArchiveSourceFormat()

  if (projectSourceFormat === 'ufo') {
    const projectMetadata = getProjectArchiveMetadata() as {
      activeUfoId?: string | null
    } | null
    const activeUfoId = projectMetadata?.activeUfoId
    const activeLayerId = input.selectedLayerId ?? 'public.default'
    if (!activeUfoId) {
      throw new Error('找不到目前啟用的 UFO 字重')
    }

    await syncHotFontDataToUfoRecords({
      projectId: input.projectId,
      activeUfoId,
      activeLayerId,
      fontData: input.fontData,
      dirtyGlyphIds: input.dirtyGlyphIds,
      deletedGlyphIds: input.deletedGlyphIds,
    })

    const now = Date.now()
    const projectRecord = await loadUfoProject(input.projectId)
    if (projectRecord) {
      await saveUfoProject({
        ...projectRecord,
        updatedAt: now,
      })
    }
    const persistedProject = await loadProject(input.projectId)
    await saveProject({
      id: input.projectId,
      title: input.projectTitle,
      lastModified: now,
      createdAt: persistedProject?.createdAt ?? projectRecord?.createdAt ?? now,
      updatedAt: now,
      sourceName:
        persistedProject?.sourceName ?? projectRecord?.sourceFolderName ?? null,
      sourceType:
        persistedProject?.sourceType ?? projectRecord?.sourceType ?? 'local',
      githubSource:
        persistedProject?.githubSource ?? projectRecord?.githubSource ?? null,
      fontData: hydrateProjectFontData(input.fontData),
      projectMetadata: persistedProject?.projectMetadata ?? projectMetadata,
      projectSourceFormat,
      projectGlyphsText: persistedProject?.projectGlyphsText ?? null,
      projectGlyphsDocument: persistedProject?.projectGlyphsDocument ?? null,
      projectGlyphsPackage: persistedProject?.projectGlyphsPackage ?? null,
    })
    await saveUfoUiValue(
      input.projectId,
      UFO_LOCAL_DELETED_GLYPHS_KEY,
      input.deletedGlyphIds
    )
    return
  }

  const persistedProject = await loadProject(input.projectId)
  const now = Date.now()
  await saveProject({
    id: input.projectId,
    title: input.projectTitle,
    lastModified: now,
    createdAt: persistedProject?.createdAt ?? now,
    updatedAt: now,
    sourceName: persistedProject?.sourceName ?? null,
    sourceType: persistedProject?.sourceType ?? 'local',
    githubSource: persistedProject?.githubSource ?? null,
    fontData: hydrateProjectFontData(input.fontData),
    projectMetadata: persistedProject?.projectMetadata ?? null,
    projectSourceFormat,
    projectGlyphsText: persistedProject?.projectGlyphsText ?? null,
    projectGlyphsDocument: persistedProject?.projectGlyphsDocument ?? null,
    projectGlyphsPackage: persistedProject?.projectGlyphsPackage ?? null,
  })
}
