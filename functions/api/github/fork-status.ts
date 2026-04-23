import type { PagesFunction } from '../../pages'
import {
  getCompareStatus,
  getCanonicalSourceRepo,
  findViewerForkRepo,
  json,
  listRepoBranches,
  parseRepoInput,
  readGitHubAccessToken,
  type Env,
} from './_utils'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const token = await readGitHubAccessToken(context.request, context.env)
  if (!token) {
    return json(
      { error: 'missing_token', message: '請先登入 GitHub。' },
      { status: 401 }
    )
  }

  const url = new URL(context.request.url)
  let parsedRepo: { owner: string; repo: string }
  try {
    parsedRepo = parseRepoInput(url.searchParams.get('repo'))
  } catch (error) {
    return json(
      {
        error: 'invalid_repo',
        message: error instanceof Error ? error.message : 'repo 參數格式錯誤',
      },
      { status: 400 }
    )
  }

  try {
    const sourceRepo = await getCanonicalSourceRepo(
      token,
      parsedRepo.owner,
      parsedRepo.repo
    )
    const forkInfo = await findViewerForkRepo(
      token,
      sourceRepo.owner,
      sourceRepo.repo
    )
    const selectedBranch = url.searchParams.get('branch')?.trim() || null

    let branches: string[] = []
    let compare: {
      status: string
      aheadBy: number
      behindBy: number
      compareUrl: string
    } | null = null

    if (forkInfo.targetRepo) {
      branches = await listRepoBranches(
        token,
        forkInfo.targetRepo.owner,
        forkInfo.targetRepo.repo
      )
      const branchForCompare =
        selectedBranch ||
        forkInfo.targetRepo.defaultBranch ||
        sourceRepo.defaultBranch

      if (branchForCompare) {
        compare = await getCompareStatus({
          token,
          sourceOwner: sourceRepo.owner,
          repo: sourceRepo.repo,
          baseBranch: sourceRepo.defaultBranch,
          headOwner: forkInfo.targetRepo.owner,
          headBranch: branchForCompare,
        })
      }
    }

    return json({
      viewerLogin: forkInfo.viewerLogin,
      sourceRepo,
      targetRepo: forkInfo.targetRepo,
      forked: forkInfo.forked,
      canDirectCommit: forkInfo.canDirectCommit,
      branches,
      selectedBranch:
        selectedBranch ||
        forkInfo.targetRepo?.defaultBranch ||
        sourceRepo.defaultBranch ||
        null,
      compare,
    })
  } catch (error) {
    return json(
      {
        error: 'fork_status_failed',
        message: error instanceof Error ? error.message : '讀取 fork 狀態失敗',
      },
      { status: 502 }
    )
  }
}
