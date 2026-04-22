import { hydrateProjectFontData, getProjectArchiveMetadata, getProjectArchiveSourceFormat } from './projectArchive'
import { saveProject, loadProject } from './persistence'
import { loadUfoProject, saveUfoProject } from './ufoPersistence'
import { syncHotFontDataToUfoRecords } from './ufoFormat'
import type { FontData } from '../store'

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
    const projectMetadata = getProjectArchiveMetadata() as
      | {
          activeUfoId?: string | null
        }
      | null
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

    const projectRecord = await loadUfoProject(input.projectId)
    if (projectRecord) {
      await saveUfoProject({
        ...projectRecord,
        updatedAt: Date.now(),
      })
    }
    return
  }

  const persistedProject = await loadProject(input.projectId)
  await saveProject({
    id: input.projectId,
    title: input.projectTitle,
    lastModified: Date.now(),
    fontData: hydrateProjectFontData(input.fontData),
    projectMetadata: persistedProject?.projectMetadata ?? null,
    projectSourceFormat,
    projectGlyphsText: persistedProject?.projectGlyphsText ?? null,
    projectGlyphsDocument: persistedProject?.projectGlyphsDocument ?? null,
    projectGlyphsPackage: persistedProject?.projectGlyphsPackage ?? null,
  })
}
