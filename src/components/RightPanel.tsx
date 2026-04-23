import {
  Box,
  Heading,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import {
  createGitHubCommit,
  fetchGitHubCompareStatus,
  createGitHubFork,
  fetchGitHubForkStatus,
  fetchGitHubViewer,
  mergeGitHubUpstream,
  logoutGitHubOAuth,
  startGitHubOAuthLogin,
  type GitHubForkStatus,
  type GitHubViewer,
} from '../lib/githubAuth'
import { markGitHubCommitSynced, prepareGitHubCommit } from '../lib/githubPr'
import {
  getArchivedGlyphLayerEntries,
  getProjectArchiveMetadata,
  getProjectArchiveSourceFormat,
} from '../lib/projectArchive'
import { saveDraftSnapshot } from '../lib/draftSave'
import { exportUfoWithWorker } from '../lib/ufoExportWorkerClient'
import { loadUfoUiValue, saveUfoUiValue } from '../lib/ufoPersistence'
import type { UfoLocalSaveManifest } from '../lib/ufoTypes'
import { syncHotFontDataToUfoRecords } from '../lib/ufoFormat'
import {
  getEffectiveNodeType,
  getGlyphLayer,
  isPathEndpointNode,
  useStore,
  type NodeType,
} from '../store'
import { GlyphSummaryCard } from './rightPanel/GlyphSummaryCard'
import { MetricsCard } from './rightPanel/MetricsCard'
import { NodeInspectorCard } from './rightPanel/NodeInspectorCard'
import { ProjectSaveCard } from './rightPanel/ProjectSaveCard'
import { GitHubCommitModal } from './rightPanel/GitHubCommitModal'
import {
  parseNumberInput,
  parseSelectedNode,
  UFO_LOCAL_MANIFEST_KEY,
  UFO_LOCAL_TARGET_KEY,
} from './rightPanel/utils'

export function RightPanel() {
  const toast = useToast()
  const gitHubModal = useDisclosure()
  const [isSavingToLocal, setIsSavingToLocal] = useState(false)
  const [isCreatingGitHubCommit, setIsCreatingGitHubCommit] = useState(false)
  const [isLoggingOutGitHub, setIsLoggingOutGitHub] = useState(false)
  const [isPreparingGitHubCommit, setIsPreparingGitHubCommit] = useState(false)
  const [isLoadingGitHubForkStatus, setIsLoadingGitHubForkStatus] =
    useState(false)
  const [isCreatingGitHubFork, setIsCreatingGitHubFork] = useState(false)
  const [isMergingGitHubUpstream, setIsMergingGitHubUpstream] = useState(false)
  const [githubViewer, setGitHubViewer] = useState<GitHubViewer | null>(null)
  const [githubForkStatus, setGitHubForkStatus] =
    useState<GitHubForkStatus | null>(null)
  const [gitHubCommitMessage, setGitHubCommitMessage] = useState('')
  const [gitHubBranchName, setGitHubBranchName] = useState('')
  const [isCreatingNewGitHubBranch, setIsCreatingNewGitHubBranch] =
    useState(false)
  const [ufoExportProgress, setUfoExportProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const selectedLayerId = useStore((state) => state.selectedLayerId)
  const workspaceView = useStore((state) => state.workspaceView)
  const selectedNodeIds = useStore((state) => state.selectedNodeIds)
  const selectedSegment = useStore((state) => state.selectedSegment)
  const fontData = useStore((state) => state.fontData)
  const projectId = useStore((state) => state.projectId)
  const projectTitle = useStore((state) => state.projectTitle)
  const isDirty = useStore((state) => state.isDirty)
  const dirtyGlyphIds = useStore((state) => state.dirtyGlyphIds)
  const deletedGlyphIds = useStore((state) => state.deletedGlyphIds)
  const hasLocalChanges = useStore((state) => state.hasLocalChanges)
  const localDirtyGlyphIds = useStore((state) => state.localDirtyGlyphIds)
  const localDeletedGlyphIds = useStore((state) => state.localDeletedGlyphIds)
  const previewGlyphMetrics = useStore((state) => state.previewGlyphMetrics)
  const updateNodePosition = useStore((state) => state.updateNodePosition)
  const updateNodeType = useStore((state) => state.updateNodeType)
  const updateGlyphMetrics = useStore((state) => state.updateGlyphMetrics)
  const convertLineSegmentToCurve = useStore(
    (state) => state.convertLineSegmentToCurve
  )
  const setSelectedLayerId = useStore((state) => state.setSelectedLayerId)
  const setWorkspaceView = useStore((state) => state.setWorkspaceView)
  const markDraftSaved = useStore((state) => state.markDraftSaved)
  const markLocalSaved = useStore((state) => state.markLocalSaved)
  const deleteGlyph = useStore((state) => state.deleteGlyph)
  const selectedProjectMetadata = getProjectArchiveMetadata() as {
    activeUfoId?: string | null
    githubSource?: {
      owner?: string
      repo?: string
      defaultBranch?: string
    } | null
  } | null
  const hasGitHubSource = Boolean(selectedProjectMetadata?.githubSource)
  const githubRepoFullName =
    selectedProjectMetadata?.githubSource?.owner &&
    selectedProjectMetadata?.githubSource?.repo
      ? `${selectedProjectMetadata.githubSource.owner}/${selectedProjectMetadata.githubSource.repo}`
      : null
  const canCommitToGitHub = Boolean(
    projectId &&
    projectTitle &&
    hasGitHubSource &&
    (localDirtyGlyphIds.length > 0 || localDeletedGlyphIds.length > 0)
  )

  const glyph =
    selectedGlyphId && fontData ? fontData.glyphs[selectedGlyphId] : null
  const activeLayer = getGlyphLayer(glyph ?? undefined, selectedLayerId)
  const displayedMetrics =
    glyph && previewGlyphMetrics?.glyphId === glyph.id
      ? previewGlyphMetrics.metrics
      : (activeLayer?.metrics ?? glyph?.metrics)
  const availableLayers = glyph ? getArchivedGlyphLayerEntries(glyph.id) : []
  const nodeRef = parseSelectedNode(selectedNodeIds[0])
  const selectedPath =
    activeLayer && nodeRef
      ? activeLayer.paths.find((path) => path.id === nodeRef.pathId)
      : null
  const selectedNode =
    selectedPath && nodeRef
      ? selectedPath.nodes.find((node) => node.id === nodeRef.nodeId)
      : null
  const effectiveNodeType =
    selectedPath && selectedNode
      ? getEffectiveNodeType(selectedPath, selectedNode)
      : undefined
  const isOnCurveNode =
    effectiveNodeType === 'corner' || effectiveNodeType === 'smooth'
  const isEndpointNode =
    selectedPath && selectedNode
      ? isPathEndpointNode(selectedPath, selectedNode.id)
      : false

  useEffect(() => {
    if (!hasGitHubSource) {
      setGitHubViewer(null)
      setGitHubForkStatus(null)
      return
    }

    let isCancelled = false
    fetchGitHubViewer()
      .then((viewer) => {
        if (!isCancelled) {
          setGitHubViewer(viewer)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setGitHubViewer(null)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [hasGitHubSource])

  useEffect(() => {
    setGitHubForkStatus(null)
    setGitHubBranchName('')
    setGitHubCommitMessage('')
    setIsCreatingNewGitHubBranch(false)
  }, [githubRepoFullName])

  const handleCoordinateChange = (axis: 'x' | 'y', value: string) => {
    if (!glyph || !nodeRef || !selectedNode) {
      return
    }

    updateNodePosition(glyph.id, nodeRef.pathId, nodeRef.nodeId, {
      x: axis === 'x' ? parseNumberInput(value) : selectedNode.x,
      y: axis === 'y' ? parseNumberInput(value) : selectedNode.y,
    })
  }

  const handleNodeTypeChange = (type: NodeType) => {
    if (!glyph || !nodeRef) {
      return
    }

    updateNodeType(glyph.id, nodeRef.pathId, nodeRef.nodeId, type)
  }

  const handleMetricsChange = (
    field: 'lsb' | 'rsb' | 'width',
    value: string
  ) => {
    if (!glyph) {
      return
    }

    updateGlyphMetrics(glyph.id, {
      [field]: parseNumberInput(value),
    })
  }

  const handleConvertSelectedSegment = () => {
    if (!glyph || !selectedSegment || selectedSegment.type !== 'line') {
      return
    }

    convertLineSegmentToCurve(
      glyph.id,
      selectedSegment.pathId,
      selectedSegment.startNodeId,
      selectedSegment.endNodeId
    )
  }

  const handleSaveUfoToLocal = async () => {
    if (!fontData || !projectId || isSavingToLocal) {
      return
    }

    try {
      setIsSavingToLocal(true)
      const projectMetadata = getProjectArchiveMetadata() as {
        activeUfoId?: string | null
      } | null
      const activeUfoId = projectMetadata?.activeUfoId
      const activeLayerId = selectedLayerId ?? 'public.default'
      if (!activeUfoId) {
        throw new Error('找不到目前啟用的 UFO 字重')
      }

      const syncResult = await syncHotFontDataToUfoRecords({
        projectId,
        activeUfoId,
        activeLayerId,
        fontData,
        dirtyGlyphIds: localDirtyGlyphIds,
        deletedGlyphIds: localDeletedGlyphIds,
      })

      let rootHandle = await loadUfoUiValue<FileSystemDirectoryHandle>(
        projectId,
        UFO_LOCAL_TARGET_KEY
      )
      if (!rootHandle) {
        const picker = (
          window as Window & {
            showDirectoryPicker?: (options?: {
              mode?: 'read' | 'readwrite'
            }) => Promise<FileSystemDirectoryHandle>
          }
        ).showDirectoryPicker
        if (!picker) {
          throw new Error('目前瀏覽器不支援資料夾輸出，請使用 Chrome 或 Edge')
        }
        rootHandle = await picker({ mode: 'readwrite' })
        await saveUfoUiValue(projectId, UFO_LOCAL_TARGET_KEY, rootHandle)
      }

      const localManifest = await loadUfoUiValue<UfoLocalSaveManifest>(
        projectId,
        UFO_LOCAL_MANIFEST_KEY
      )
      setUfoExportProgress({ completed: 0, total: localDirtyGlyphIds.length })
      const result = await exportUfoWithWorker({
        projectId,
        exportAll: false,
        markClean: true,
        fixedConcurrency: 8,
        directoryMode: 'direct',
        rootHandle,
        localManifest,
        deletedFilePaths: syncResult.deletedFilePaths,
        onProgress: (progress) => setUfoExportProgress(progress),
      })

      await saveUfoUiValue(projectId, UFO_LOCAL_MANIFEST_KEY, result.manifest)
      const deletedCount = localDeletedGlyphIds.length
      markLocalSaved()
      toast({
        title: '已儲存至本地',
        description: result.didFullRebuild
          ? `偵測到本地缺檔，已全量重建並寫出 ${result.writtenGlyphs} 個 glyph${deletedCount > 0 ? `，刪除 ${deletedCount} 個 glyph 檔案` : ''}。`
          : `已寫出 ${result.writtenGlyphs} 個 glyph，略過 ${result.skippedGlyphs} 個未變更 glyph${deletedCount > 0 ? `，刪除 ${deletedCount} 個 glyph 檔案` : ''}。`,
        status: 'success',
        duration: 2400,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: '本地儲存失敗',
        description:
          error instanceof Error
            ? error.message
            : '目前無法將 UFO 寫入本地資料夾。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
      console.warn('UFO local save failed.', error)
    } finally {
      setIsSavingToLocal(false)
      setUfoExportProgress(null)
    }
  }

  const handleSaveProject = async () => {
    if (!fontData || !projectId || !projectTitle) {
      return
    }

    try {
      await saveDraftSnapshot({
        projectId,
        projectTitle,
        fontData,
        dirtyGlyphIds,
        deletedGlyphIds,
        selectedLayerId,
      })
      markDraftSaved()
      toast({
        title: '已儲存草稿',
        description: '目前變更已寫入本機草稿。',
        status: 'success',
        duration: 2200,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: '無法寫入本機草稿，請稍後再試。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
      console.warn('Manual project save failed.', error)
    }
  }

  const handleLoginGitHub = async () => {
    try {
      await startGitHubOAuthLogin()
      const viewer = await fetchGitHubViewer()
      setGitHubViewer(viewer)
      if (githubRepoFullName) {
        const forkStatus = await fetchGitHubForkStatus(
          githubRepoFullName,
          gitHubBranchName.trim() || undefined
        )
        setGitHubForkStatus(forkStatus)
      }
      toast({
        title: 'GitHub 已登入',
        description: `目前登入帳號：${viewer.login}`,
        status: 'success',
        duration: 2600,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'GitHub 登入失敗',
        description:
          error instanceof Error ? error.message : '目前無法完成 GitHub 登入。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
    }
  }

  const handleLogoutGitHub = async () => {
    if (isLoggingOutGitHub) {
      return
    }

    try {
      setIsLoggingOutGitHub(true)
      await logoutGitHubOAuth()
      setGitHubViewer(null)
      setGitHubForkStatus(null)
      toast({
        title: 'GitHub 已登出',
        description: '目前 session 已清除。',
        status: 'success',
        duration: 2200,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'GitHub 登出失敗',
        description:
          error instanceof Error ? error.message : '目前無法登出 GitHub。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
    } finally {
      setIsLoggingOutGitHub(false)
    }
  }

  const loadGitHubForkStatus = async (branchName?: string) => {
    if (!githubRepoFullName) {
      return
    }

    try {
      setIsLoadingGitHubForkStatus(true)
      const forkStatus = await fetchGitHubForkStatus(
        githubRepoFullName,
        branchName?.trim() || undefined
      )
      setGitHubForkStatus(forkStatus)
      const nextBranch = branchName?.trim() || forkStatus.selectedBranch || ''
      if (nextBranch) {
        setGitHubBranchName(nextBranch)
        setIsCreatingNewGitHubBranch(
          !forkStatus.branches.includes(nextBranch.trim())
        )
      }
      return forkStatus
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '目前無法讀取 GitHub fork 狀態。'

      if (
        /登入 GitHub/.test(message) ||
        /missing_token/.test(message) ||
        /401/.test(message)
      ) {
        setGitHubForkStatus(null)
        return null
      }

      toast({
        title: '讀取 GitHub 狀態失敗',
        description: message,
        status: 'error',
        duration: 3600,
        isClosable: true,
      })
      return null
    } finally {
      setIsLoadingGitHubForkStatus(false)
    }
  }

  const refreshGitHubCompareStatus = async (branchName: string) => {
    if (
      !githubRepoFullName ||
      !githubForkStatus?.targetRepo ||
      !branchName.trim()
    ) {
      return
    }

    const compareStatus = await fetchGitHubCompareStatus({
      repo: githubRepoFullName,
      headOwner: githubForkStatus.targetRepo.owner,
      headBranch: branchName.trim(),
    })

    setGitHubForkStatus((current) =>
      current
        ? {
            ...current,
            sourceRepo: compareStatus.sourceRepo,
            compare: compareStatus.compare,
            selectedBranch: branchName.trim(),
          }
        : current
    )
  }

  const handleOpenGitHubModal = async () => {
    gitHubModal.onOpen()

    if (!projectId || !projectTitle) {
      return
    }

    const projectMetadata = getProjectArchiveMetadata() as {
      activeUfoId?: string | null
    } | null
    const activeUfoId = projectMetadata?.activeUfoId

    if (!activeUfoId) {
      toast({
        title: '無法準備 GitHub 提交',
        description: '找不到目前啟用的 UFO 字重。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
      return
    }

    const forkStatus = githubViewer
      ? await loadGitHubForkStatus(gitHubBranchName.trim() || undefined)
      : null

    if (!canCommitToGitHub) {
      return
    }

    try {
      setIsPreparingGitHubCommit(true)
      const preparedCommit = await prepareGitHubCommit({
        projectId,
        projectTitle,
        activeUfoId,
      })
      setGitHubCommitMessage(preparedCommit.request.commitMessage)
      if (!gitHubBranchName.trim()) {
        if (forkStatus?.selectedBranch) {
          setGitHubBranchName(forkStatus.selectedBranch)
          setIsCreatingNewGitHubBranch(false)
        } else {
          setGitHubBranchName(
            preparedCommit.request.branchName ??
              `kumiko/${
                preparedCommit.changedGlyphNames
                  .slice(0, 2)
                  .join('-')
                  .toLowerCase() || `patch-${Date.now()}`
              }`
          )
          setIsCreatingNewGitHubBranch(true)
        }
      }
    } catch (error) {
      toast({
        title: '無法準備 GitHub commit',
        description:
          error instanceof Error
            ? error.message
            : '目前沒有可提交到 GitHub 的變更。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
    } finally {
      setIsPreparingGitHubCommit(false)
    }
  }

  const handleCreateFork = async () => {
    if (!githubRepoFullName || isCreatingGitHubFork) {
      return
    }

    try {
      setIsCreatingGitHubFork(true)
      const result = await createGitHubFork(githubRepoFullName)
      setGitHubForkStatus(result)
      if (!gitHubBranchName.trim() && result.selectedBranch) {
        setGitHubBranchName(result.selectedBranch)
        setIsCreatingNewGitHubBranch(false)
      }
      toast({
        title: 'GitHub fork 已建立',
        description: result.targetRepo?.fullName ?? githubRepoFullName,
        status: 'success',
        duration: 3200,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: '建立 fork 失敗',
        description:
          error instanceof Error ? error.message : '目前無法建立 GitHub fork。',
        status: 'error',
        duration: 3600,
        isClosable: true,
      })
    } finally {
      setIsCreatingGitHubFork(false)
    }
  }

  const handleCreateGitHubCommit = async () => {
    if (!fontData || !projectId || !projectTitle || isCreatingGitHubCommit) {
      return
    }

    const projectMetadata = getProjectArchiveMetadata() as {
      activeUfoId?: string | null
    } | null
    const activeUfoId = projectMetadata?.activeUfoId
    const activeLayerId = selectedLayerId ?? 'public.default'

    if (!activeUfoId) {
      toast({
        title: '無法建立 commit',
        description: '找不到目前啟用的 UFO 字重。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
      return
    }

    if (!gitHubBranchName.trim()) {
      toast({
        title: '請先指定 branch',
        description: '你可以選現有 branch，或輸入一個新的 branch 名稱。',
        status: 'warning',
        duration: 2800,
        isClosable: true,
      })
      return
    }

    try {
      setIsCreatingGitHubCommit(true)

      const syncResult = await syncHotFontDataToUfoRecords({
        projectId,
        activeUfoId,
        activeLayerId,
        fontData,
        dirtyGlyphIds: localDirtyGlyphIds,
        deletedGlyphIds: localDeletedGlyphIds,
      })

      const preparedCommit = await prepareGitHubCommit({
        projectId,
        projectTitle,
        activeUfoId,
        deletedFilePaths: syncResult.deletedFilePaths,
      })

      const result = await createGitHubCommit({
        ...preparedCommit.request,
        commitMessage:
          gitHubCommitMessage.trim() || preparedCommit.request.commitMessage,
        branchName: gitHubBranchName.trim(),
      })
      await markGitHubCommitSynced(preparedCommit.exportStateUpdates)
      markDraftSaved()
      setGitHubForkStatus((current) =>
        current
          ? {
              ...current,
              selectedBranch: result.branchName,
              compare: result.compare,
              branches: current.branches.includes(result.branchName)
                ? current.branches
                : [result.branchName, ...current.branches],
            }
          : current
      )
      setGitHubBranchName(result.branchName)
      setIsCreatingNewGitHubBranch(false)
      toast({
        title: 'GitHub commit 已推送',
        description: `已更新 ${result.headOwner}:${result.branchName}`,
        status: 'success',
        duration: 3600,
        isClosable: true,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '目前無法建立 GitHub commit。'

      if (
        /登入 GitHub/.test(message) ||
        /missing_token/.test(message) ||
        /401/.test(message)
      ) {
        toast({
          title: '需要 GitHub 登入',
          description: '請先登入 GitHub，再重新提交 commit。',
          status: 'warning',
          duration: 3200,
          isClosable: true,
        })
        void handleLoginGitHub()
        return
      }

      toast({
        title: '建立 commit 失敗',
        description: message,
        status: 'error',
        duration: 4200,
        isClosable: true,
      })
      console.warn('GitHub commit failed.', error)
    } finally {
      setIsCreatingGitHubCommit(false)
    }
  }

  const handleMergeGitHubUpstream = async () => {
    if (
      !githubRepoFullName ||
      !gitHubBranchName.trim() ||
      isMergingGitHubUpstream
    ) {
      return
    }

    try {
      setIsMergingGitHubUpstream(true)
      const result = await mergeGitHubUpstream({
        repo: githubRepoFullName,
        branchName: gitHubBranchName.trim(),
      })
      await refreshGitHubCompareStatus(result.branchName)
      toast({
        title: '已合併上游變更',
        description: result.message,
        status: 'success',
        duration: 3600,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: '合併上游失敗',
        description:
          error instanceof Error ? error.message : '目前無法合併上游變更。',
        status: 'error',
        duration: 4200,
        isClosable: true,
      })
    } finally {
      setIsMergingGitHubUpstream(false)
    }
  }

  return (
    <Box
      p={4}
      h="100%"
      overflowY="auto"
      bg="#fbfcfe"
      borderLeft="1px solid"
      borderColor="blackAlpha.200"
    >
      <Stack spacing={5}>
        <Box>
          <Text
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.16em"
            color="gray.500"
            mb={1}
          >
            Module C
          </Text>
          <Heading size="md" color="gray.800">
            屬性與儲存
          </Heading>
        </Box>

        {!glyph ? (
          <Text fontSize="sm" color="gray.500">
            尚未選取字形。
          </Text>
        ) : (
          <Stack spacing={4}>
            <GlyphSummaryCard
              activeLayer={activeLayer ?? null}
              availableLayers={availableLayers}
              glyph={glyph}
              isDirty={isDirty}
              selectedLayerId={selectedLayerId}
              workspaceView={workspaceView}
              onDeleteGlyph={() => {
                deleteGlyph(glyph.id)
                toast({
                  title: '已刪除字符',
                  description: `${glyph.id} 已從目前專案移除。`,
                  status: 'success',
                  duration: 2200,
                  isClosable: true,
                })
              }}
              onEnterEditor={() => setWorkspaceView('editor')}
              onLayerChange={setSelectedLayerId}
            />

            <ProjectSaveCard
              canSaveDraft={Boolean(
                fontData && projectId && projectTitle && isDirty
              )}
              canSaveLocal={Boolean(
                fontData && hasLocalChanges && !isSavingToLocal
              )}
              hasUfoSource={getProjectArchiveSourceFormat() === 'ufo'}
              hasGitHubSource={hasGitHubSource}
              isSavingToLocal={isSavingToLocal}
              loadingText={
                ufoExportProgress
                  ? `儲存中 ${ufoExportProgress.completed}/${ufoExportProgress.total}`
                  : '儲存中...'
              }
              onOpenGitHubModal={() => void handleOpenGitHubModal()}
              onSaveLocal={handleSaveUfoToLocal}
              onSaveProject={handleSaveProject}
            />

            <NodeInspectorCard
              effectiveNodeType={effectiveNodeType}
              isEndpointNode={isEndpointNode}
              isOnCurveNode={isOnCurveNode}
              nodeRef={nodeRef}
              selectedNode={selectedNode ?? null}
              selectedSegment={selectedSegment}
              onCoordinateChange={handleCoordinateChange}
              onConvertSelectedSegment={handleConvertSelectedSegment}
              onNodeTypeChange={handleNodeTypeChange}
            />

            <MetricsCard
              displayedMetrics={displayedMetrics}
              onMetricsChange={handleMetricsChange}
            />
          </Stack>
        )}
      </Stack>

      <GitHubCommitModal
        isOpen={gitHubModal.isOpen}
        onClose={gitHubModal.onClose}
        githubViewer={githubViewer}
        githubForkStatus={githubForkStatus}
        isLoggingOutGitHub={isLoggingOutGitHub}
        isLoadingGitHubForkStatus={isLoadingGitHubForkStatus}
        isCreatingGitHubFork={isCreatingGitHubFork}
        isPreparingGitHubCommit={isPreparingGitHubCommit}
        isCreatingGitHubCommit={isCreatingGitHubCommit}
        isMergingGitHubUpstream={isMergingGitHubUpstream}
        canCommitToGitHub={canCommitToGitHub}
        gitHubCommitMessage={gitHubCommitMessage}
        gitHubBranchName={gitHubBranchName}
        isCreatingNewBranch={isCreatingNewGitHubBranch}
        onLoginGitHub={() => void handleLoginGitHub()}
        onLogoutGitHub={() => void handleLogoutGitHub()}
        onCreateFork={() => void handleCreateFork()}
        onBranchSelect={(branch) => {
          setGitHubBranchName(branch)
          setIsCreatingNewGitHubBranch(false)
          void refreshGitHubCompareStatus(branch)
        }}
        onCommitMessageChange={setGitHubCommitMessage}
        onBranchNameChange={(value) => {
          setGitHubBranchName(value)
          setIsCreatingNewGitHubBranch(true)
        }}
        onStartNewBranch={() => {
          setIsCreatingNewGitHubBranch(true)
          setGitHubBranchName(`kumiko/patch-${Date.now()}`)
        }}
        onOpenCompare={() => {
          if (githubForkStatus?.compare?.compareUrl) {
            window.open(
              githubForkStatus.compare.compareUrl,
              '_blank',
              'noopener,noreferrer'
            )
          }
        }}
        onMergeUpstream={() => void handleMergeGitHubUpstream()}
        onCreateCommit={() => void handleCreateGitHubCommit()}
      />
    </Box>
  )
}
