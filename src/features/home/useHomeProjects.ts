import { useCallback, useEffect, useRef, useState } from 'react'
import { UFO_LOCAL_DELETED_GLYPHS_KEY } from '../../lib/draftSave'
import { importBinaryFontFile } from '../../lib/fontBinaryFormat'
import { importGitHubRepo } from '../../lib/githubImport'
import {
  deleteProject,
  getAllProjects,
  loadProject,
  saveProject,
  type ProjectSummary,
} from '../../lib/persistence'
import {
  deleteUfoProjectData,
  listDirtyUfoGlyphs,
  loadUfoUiValue,
} from '../../lib/ufoPersistence'
import {
  importUfoWorkspace,
  loadUfoProjectIntoFontData,
  type ImportedUfoWorkspace,
} from '../../lib/ufoFormat'
import { useStore } from '../../store'
import { clearGitHubUrlParams, getGitHubRepoUrl } from './githubRepoUrl'
import type { PendingGitHubImport } from './types'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '未知錯誤'

const toProjectSummary = (project: {
  id: string
  title: string
  lastModified: number
  createdAt?: number
  updatedAt?: number
  sourceName?: string | null
  sourceType?: ProjectSummary['sourceType']
  githubSource?: ProjectSummary['githubSource']
  projectSourceFormat?: ProjectSummary['projectSourceFormat']
}): ProjectSummary => ({
  id: project.id,
  title: project.title,
  lastModified: project.lastModified,
  createdAt: project.createdAt ?? project.lastModified,
  updatedAt: project.updatedAt ?? project.lastModified,
  sourceName: project.sourceName ?? null,
  sourceType: project.sourceType ?? 'local',
  githubSource: project.githubSource ?? null,
  projectSourceFormat: project.projectSourceFormat ?? null,
})

export function useHomeProjects() {
  const loadProjectState = useStore((state) => state.loadProjectState)
  const hydratePersistedLocalChanges = useStore(
    (state) => state.hydratePersistedLocalChanges
  )
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isDraggingLocal, setIsDraggingLocal] = useState(false)
  const [isLoadingLocal, setIsLoadingLocal] = useState(false)
  const [isLoadingGitHub, setIsLoadingGitHub] = useState(false)
  const [githubRepoInput, setGitHubRepoInput] = useState('')
  const [githubRefInput, setGitHubRefInput] = useState('')
  const [showGitHubRefInput, setShowGitHubRefInput] = useState(false)
  const [pendingGitHubImport, setPendingGitHubImport] =
    useState<PendingGitHubImport | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const localDragDepthRef = useRef(0)
  const hasAutoImportedFromUrlRef = useRef(false)

  useEffect(() => {
    getAllProjects().then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (!folderInputRef.current) {
      return
    }
    folderInputRef.current.setAttribute('webkitdirectory', '')
    folderInputRef.current.setAttribute('directory', '')
  }, [])

  const upsertProjectSummary = (project: ProjectSummary) => {
    setProjects((current) => [
      project,
      ...current.filter((item) => item.id !== project.id),
    ])
  }

  const saveImportedUfoAsKumikoProject = async (
    importedProject: ImportedUfoWorkspace
  ) => {
    const now = Date.now()
    const project = importedProject.project
    const summary = toProjectSummary({
      id: project.projectId,
      title: project.title,
      lastModified: now,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      sourceName: project.sourceFolderName,
      sourceType: project.sourceType ?? 'local',
      githubSource: project.githubSource ?? null,
      projectSourceFormat: importedProject.projectSourceFormat,
    })

    await saveProject({
      id: summary.id,
      title: summary.title,
      lastModified: summary.lastModified,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      sourceName: summary.sourceName,
      sourceType: summary.sourceType,
      githubSource: summary.githubSource,
      fontData: importedProject.fontData,
      projectMetadata: importedProject.projectMetadata,
      projectSourceFormat: importedProject.projectSourceFormat,
      projectGlyphsText: null,
      projectGlyphsDocument: null,
      projectGlyphsPackage: null,
    })
    upsertProjectSummary(summary)
  }

  const importFromFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) {
      return
    }

    const hasFolderEntries = selectedFiles.some((file) =>
      file.webkitRelativePath.includes('/')
    )
    if (!hasFolderEntries && selectedFiles.length === 1) {
      const extension = selectedFiles[0].name.split('.').pop()?.toLowerCase()
      if (
        extension &&
        ['ttf', 'otf', 'woff', 'woff2', 'oft'].includes(extension)
      ) {
        const importedBinary = await importBinaryFontFile(selectedFiles[0])
        if (!importedBinary) {
          throw new Error('字型檔解析失敗')
        }
        const now = Date.now()
        const summary = toProjectSummary({
          id: importedBinary.projectId,
          title: importedBinary.projectTitle,
          lastModified: now,
          sourceName: selectedFiles[0].name,
          sourceType: 'local',
          projectSourceFormat: importedBinary.sourceFormat,
        })

        await saveProject({
          id: summary.id,
          title: summary.title,
          lastModified: summary.lastModified,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
          sourceName: summary.sourceName,
          sourceType: summary.sourceType,
          githubSource: null,
          fontData: importedBinary.fontData,
          projectMetadata: { importedFrom: extension },
          projectSourceFormat: importedBinary.sourceFormat,
          projectGlyphsText: null,
          projectGlyphsDocument: null,
          projectGlyphsPackage: null,
        })
        upsertProjectSummary(summary)
        loadProjectState(
          importedBinary.projectId,
          importedBinary.projectTitle,
          importedBinary.fontData,
          { importedFrom: extension },
          importedBinary.sourceFormat
        )
        return
      }
    }

    const importedProject = await importUfoWorkspace(selectedFiles)
    await saveImportedUfoAsKumikoProject(importedProject)
    loadProjectState(
      importedProject.project.projectId,
      importedProject.project.title,
      importedProject.fontData,
      importedProject.projectMetadata,
      importedProject.projectSourceFormat
    )
  }

  const restorePersistedUfoChanges = useCallback(
    async (projectId: string) => {
      const dirtyGlyphs = await listDirtyUfoGlyphs(projectId)
      const deletedGlyphIds =
        (await loadUfoUiValue<string[]>(
          projectId,
          UFO_LOCAL_DELETED_GLYPHS_KEY
        )) ?? []
      hydratePersistedLocalChanges(
        dirtyGlyphs.map((glyph) => glyph.glyphName),
        deletedGlyphIds
      )
    },
    [hydratePersistedLocalChanges]
  )

  const handleFolderUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files
      ? Array.from(event.target.files)
      : []
    if (selectedFiles.length === 0) {
      return
    }

    setIsLoadingLocal(true)

    setTimeout(async () => {
      try {
        await importFromFiles(selectedFiles)
      } catch (error: unknown) {
        console.error(error)
        alert(`讀取本地專案失敗: ${getErrorMessage(error)}`)
      } finally {
        setIsLoadingLocal(false)
        event.target.value = ''
      }
    }, 100)
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await handleFolderUpload(event)
  }

  const handleDropUpload = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    localDragDepthRef.current = 0
    setIsDraggingLocal(false)
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length === 0) {
      return
    }
    setIsLoadingLocal(true)
    try {
      await importFromFiles(files)
    } catch (error: unknown) {
      console.error(error)
      alert(`拖曳匯入失敗: ${getErrorMessage(error)}`)
    } finally {
      setIsLoadingLocal(false)
    }
  }

  const handleLocalDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    localDragDepthRef.current += 1
    setIsDraggingLocal(true)
  }

  const handleLocalDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingLocal(true)
  }

  const handleLocalDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    localDragDepthRef.current = Math.max(0, localDragDepthRef.current - 1)
    if (localDragDepthRef.current === 0) {
      setIsDraggingLocal(false)
    }
  }

  const importGitHubProject = useCallback(
    async (input: { repo: string; ref: string; errorLabel: string }) => {
      if (!input.repo.trim() || isLoadingGitHub) {
        return
      }

      setIsLoadingGitHub(true)
      try {
        const importedProject = await importGitHubRepo({
          repo: input.repo,
          ref: input.ref,
        })
        await saveImportedUfoAsKumikoProject(importedProject)
        loadProjectState(
          importedProject.project.projectId,
          importedProject.project.title,
          importedProject.fontData,
          importedProject.projectMetadata,
          importedProject.projectSourceFormat
        )
        await restorePersistedUfoChanges(importedProject.project.projectId)
        clearGitHubUrlParams()
      } catch (error: unknown) {
        console.error(error)
        alert(`${input.errorLabel}: ${getErrorMessage(error)}`)
      } finally {
        setIsLoadingGitHub(false)
      }
    },
    [isLoadingGitHub, loadProjectState, restorePersistedUfoChanges]
  )

  const handleGitHubImport = async () => {
    if (!githubRepoInput.trim()) {
      return
    }

    await importGitHubProject({
      repo: githubRepoInput,
      ref: githubRefInput,
      errorLabel: '讀取 GitHub 專案失敗',
    })
  }

  const handleCancelPendingGitHubImport = () => {
    setPendingGitHubImport(null)
    clearGitHubUrlParams()
  }

  const handleConfirmPendingGitHubImport = async () => {
    if (!pendingGitHubImport) {
      return
    }

    const { repo, ref } = pendingGitHubImport
    setPendingGitHubImport(null)
    await importGitHubProject({
      repo,
      ref,
      errorLabel: '載入 GitHub 專案失敗',
    })
  }

  useEffect(() => {
    if (hasAutoImportedFromUrlRef.current) {
      return
    }

    const url = new URL(window.location.href)
    const repo = url.searchParams.get('repo')?.trim()
    const ref = url.searchParams.get('ref')?.trim() ?? ''

    if (!repo) {
      return
    }

    hasAutoImportedFromUrlRef.current = true
    setGitHubRepoInput(repo)
    setGitHubRefInput(ref)
    setShowGitHubRefInput(Boolean(ref))
    setPendingGitHubImport({
      repo,
      ref,
      repoUrl: getGitHubRepoUrl(repo),
    })
  }, [])

  const handleOpenProject = async (project: ProjectSummary) => {
    if (project.projectSourceFormat === 'ufo') {
      const loadedProject = await loadUfoProjectIntoFontData(project.id)
      if (loadedProject) {
        loadProjectState(
          loadedProject.project.projectId,
          loadedProject.project.title,
          loadedProject.fontData,
          loadedProject.projectMetadata,
          'ufo'
        )
        await restorePersistedUfoChanges(loadedProject.project.projectId)
        return
      }
    }

    const draft = await loadProject(project.id)
    if (!draft?.fontData) {
      return
    }
    loadProjectState(
      draft.id,
      draft.title,
      draft.fontData,
      draft.projectMetadata ?? null,
      draft.projectSourceFormat ?? null
    )
  }

  const handleDeleteProject = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (window.confirm('確定要永久刪除此字體專案草稿嗎？此動作無法復原。')) {
      try {
        await deleteProject(id)
        await deleteUfoProjectData(id)
        setProjects((prev) => prev.filter((project) => project.id !== id))
      } catch (err) {
        console.error(err)
        alert('刪除失敗')
      }
    }
  }

  return {
    githubRefInput,
    githubRepoInput,
    isDraggingLocal,
    isLoadingGitHub,
    isLoadingLocal,
    folderInputRef,
    fileInputRef,
    pendingGitHubImport,
    projects,
    setGithubRefInput: setGitHubRefInput,
    setGithubRepoInput: setGitHubRepoInput,
    setShowGitHubRefInput,
    showGitHubRefInput,
    handleCancelPendingGitHubImport,
    handleConfirmPendingGitHubImport,
    handleDeleteProject,
    handleLocalDragEnter,
    handleLocalDragLeave,
    handleLocalDragOver,
    handleGitHubImport,
    handleOpenProject,
    handleFolderUpload,
    handleFileUpload,
    handleDropUpload,
  }
}
