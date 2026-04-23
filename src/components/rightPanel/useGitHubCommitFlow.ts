import { useDisclosure, useToast } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  startGitHubOAuthLogin,
  type GitHubForkStatus,
} from '../../lib/githubAuth'
import {
  applyCompareToForkStatus,
  fetchCachedGitHubCompareStatus,
  fetchCachedGitHubForkStatus,
  setForkStatusQueryData,
  useCreateGitHubCommitMutation,
  useCreateGitHubForkMutation,
  useGitHubForkStatusQuery,
  useGitHubViewerQuery,
  useLoginGitHubMutation,
  useLogoutGitHubMutation,
  useMergeGitHubUpstreamMutation,
} from '../../lib/githubQueries'
import { markGitHubCommitSynced, prepareGitHubCommit } from '../../lib/githubPr'
import { getProjectArchiveMetadata } from '../../lib/projectArchive'
import { syncHotFontDataToUfoRecords } from '../../lib/ufoFormat'
import type { FontData } from '../../store'
import type { GitHubCommitModalProps } from './GitHubCommitModal'

interface UseGitHubCommitFlowInput {
  projectId: string | null
  projectTitle: string
  fontData: FontData | null
  selectedLayerId: string | null
  hasGitHubSource: boolean
  githubRepoFullName: string | null
  canCommitToGitHub: boolean
  localDirtyGlyphIds: string[]
  localDeletedGlyphIds: string[]
  markDraftSaved: () => void
}

const isMissingGitHubTokenError = (message: string) =>
  /登入 GitHub/.test(message) ||
  /missing_token/.test(message) ||
  /401/.test(message)

export const useGitHubCommitFlow = ({
  projectId,
  projectTitle,
  fontData,
  selectedLayerId,
  hasGitHubSource,
  githubRepoFullName,
  canCommitToGitHub,
  localDirtyGlyphIds,
  localDeletedGlyphIds,
  markDraftSaved,
}: UseGitHubCommitFlowInput) => {
  const toast = useToast()
  const gitHubModal = useDisclosure()
  const [isPreparingGitHubCommit, setIsPreparingGitHubCommit] = useState(false)
  const [forkStatusOverride, setForkStatusOverride] =
    useState<GitHubForkStatus | null>(null)
  const [gitHubCommitMessage, setGitHubCommitMessage] = useState('')
  const [gitHubBranchName, setGitHubBranchName] = useState('')
  const [isCreatingNewGitHubBranch, setIsCreatingNewGitHubBranch] =
    useState(false)
  const queryClient = useQueryClient()
  const viewerQuery = useGitHubViewerQuery(hasGitHubSource)
  const githubViewer = viewerQuery.data ?? null
  const forkStatusQuery = useGitHubForkStatusQuery({
    repo: githubRepoFullName,
    branch: null,
    enabled:
      gitHubModal.isOpen &&
      Boolean(githubViewer && githubRepoFullName) &&
      !forkStatusOverride,
  })
  const loginMutation = useLoginGitHubMutation()
  const logoutMutation = useLogoutGitHubMutation()
  const createForkMutation = useCreateGitHubForkMutation()
  const createCommitMutation = useCreateGitHubCommitMutation()
  const mergeUpstreamMutation = useMergeGitHubUpstreamMutation()
  const githubForkStatus = forkStatusOverride ?? forkStatusQuery.data ?? null

  useEffect(() => {
    if (!hasGitHubSource) {
      setForkStatusOverride(null)
      return
    }
  }, [hasGitHubSource])

  useEffect(() => {
    setForkStatusOverride(null)
    setGitHubBranchName('')
    setGitHubCommitMessage('')
    setIsCreatingNewGitHubBranch(false)
  }, [githubRepoFullName])

  const loadGitHubForkStatus = async (branchName?: string) => {
    if (!githubRepoFullName) {
      return null
    }

    try {
      const forkStatus = await fetchCachedGitHubForkStatus(queryClient, {
        repo: githubRepoFullName,
        branch: branchName,
      })
      setForkStatusOverride(forkStatus)
      const resolvedBranch =
        branchName?.trim() || forkStatus.selectedBranch || ''
      if (resolvedBranch) {
        setGitHubBranchName(resolvedBranch)
        setIsCreatingNewGitHubBranch(
          !forkStatus.branches.includes(resolvedBranch.trim())
        )
      }
      return forkStatus
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '目前無法讀取 GitHub fork 狀態。'

      if (isMissingGitHubTokenError(message)) {
        setForkStatusOverride(null)
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
    }
  }

  const refreshGitHubCompareStatus = async (branchName: string) => {
    if (!githubForkStatus?.targetRepo || !branchName.trim()) {
      return
    }

    const selectedBranch = branchName.trim()
    const compareStatus = await fetchCachedGitHubCompareStatus(queryClient, {
      repo: githubForkStatus.sourceRepo.fullName,
      headOwner: githubForkStatus.targetRepo.owner,
      headBranch: selectedBranch,
    })

    setForkStatusOverride(
      setForkStatusQueryData(
        queryClient,
        applyCompareToForkStatus(
          githubForkStatus,
          compareStatus,
          selectedBranch
        )
      )
    )
  }

  const handleLoginGitHub = async () => {
    try {
      const viewer = await loginMutation.mutateAsync(startGitHubOAuthLogin)
      if (githubRepoFullName) {
        await loadGitHubForkStatus(gitHubBranchName.trim() || undefined)
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
    if (logoutMutation.isPending) {
      return
    }

    try {
      await logoutMutation.mutateAsync()
      setForkStatusOverride(null)
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
    }
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
    if (!githubRepoFullName || createForkMutation.isPending) {
      return
    }

    try {
      const result = await createForkMutation.mutateAsync(githubRepoFullName)
      setForkStatusOverride(result)
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
    }
  }

  const handleCreateGitHubCommit = async () => {
    if (
      !fontData ||
      !projectId ||
      !projectTitle ||
      createCommitMutation.isPending
    ) {
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

      const result = await createCommitMutation.mutateAsync({
        ...preparedCommit.request,
        commitMessage:
          gitHubCommitMessage.trim() || preparedCommit.request.commitMessage,
        branchName: gitHubBranchName.trim(),
      })
      await markGitHubCommitSynced(preparedCommit.exportStateUpdates)
      markDraftSaved()
      if (githubForkStatus) {
        setForkStatusOverride(
          setForkStatusQueryData(queryClient, githubForkStatus, {
            selectedBranch: result.branchName,
            compare: result.compare,
            branches: githubForkStatus.branches.includes(result.branchName)
              ? githubForkStatus.branches
              : [result.branchName, ...githubForkStatus.branches],
          })
        )
      }
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

      if (isMissingGitHubTokenError(message)) {
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
    }
  }

  const handleMergeGitHubUpstream = async () => {
    if (!githubRepoFullName || !gitHubBranchName.trim()) {
      return
    }

    if (mergeUpstreamMutation.isPending) {
      return
    }

    try {
      const result = await mergeUpstreamMutation.mutateAsync({
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
    }
  }

  const modalProps: GitHubCommitModalProps = {
    isOpen: gitHubModal.isOpen,
    onClose: gitHubModal.onClose,
    githubViewer,
    githubForkStatus,
    isLoggingOutGitHub: logoutMutation.isPending,
    isLoadingGitHubForkStatus: forkStatusQuery.isFetching,
    isCreatingGitHubFork: createForkMutation.isPending,
    isPreparingGitHubCommit,
    isCreatingGitHubCommit: createCommitMutation.isPending,
    isMergingGitHubUpstream: mergeUpstreamMutation.isPending,
    canCommitToGitHub,
    gitHubCommitMessage,
    gitHubBranchName,
    isCreatingNewBranch: isCreatingNewGitHubBranch,
    onLoginGitHub: () => void handleLoginGitHub(),
    onLogoutGitHub: () => void handleLogoutGitHub(),
    onCreateFork: () => void handleCreateFork(),
    onBranchSelect: (branch) => {
      setGitHubBranchName(branch)
      setIsCreatingNewGitHubBranch(false)
      void refreshGitHubCompareStatus(branch)
    },
    onCommitMessageChange: setGitHubCommitMessage,
    onBranchNameChange: (value) => {
      setGitHubBranchName(value)
      setIsCreatingNewGitHubBranch(true)
    },
    onStartNewBranch: () => {
      setIsCreatingNewGitHubBranch(true)
      setGitHubBranchName(`kumiko/patch-${Date.now()}`)
    },
    onOpenCompare: () => {
      if (githubForkStatus?.compare?.compareUrl) {
        window.open(
          githubForkStatus.compare.compareUrl,
          '_blank',
          'noopener,noreferrer'
        )
      }
    },
    onMergeUpstream: () => void handleMergeGitHubUpstream(),
    onCreateCommit: () => void handleCreateGitHubCommit(),
  }

  return {
    openGitHubModal: handleOpenGitHubModal,
    modalProps,
  }
}
