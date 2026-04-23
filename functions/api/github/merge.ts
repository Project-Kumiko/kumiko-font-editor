import type { PagesFunction } from '../../pages'
import {
  getCanonicalSourceRepo,
  findViewerForkRepo,
  githubApiFetch,
  json,
  parseRepoInput,
  readGitHubAccessToken,
  type Env,
} from './_utils'

interface GitHubMergePayload {
  repo: string
  branchName?: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const token = await readGitHubAccessToken(context.request, context.env)
  if (!token) {
    return json(
      { error: 'missing_token', message: 'merge 前請先登入 GitHub。' },
      { status: 401 }
    )
  }

  let payload: GitHubMergePayload
  try {
    payload = (await context.request.json()) as GitHubMergePayload
  } catch {
    return json(
      { error: 'invalid_json', message: '請求 body 必須是 JSON' },
      { status: 400 }
    )
  }

  let parsedRepo: { owner: string; repo: string }
  try {
    parsedRepo = parseRepoInput(payload.repo ?? null)
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
    const targetRepo = forkInfo.targetRepo
    const branchName =
      payload.branchName?.trim() ||
      targetRepo?.defaultBranch ||
      sourceRepo.defaultBranch

    if (!targetRepo || !branchName) {
      throw new Error('找不到可合併的目標 branch')
    }

    let message = ''

    if (forkInfo.forked && targetRepo.owner !== sourceRepo.owner) {
      const response = await githubApiFetch(
        token,
        `/repos/${targetRepo.owner}/${targetRepo.repo}/merge-upstream`,
        {
          method: 'POST',
          body: JSON.stringify({
            branch: branchName,
          }),
        }
      )
      const payloadText = await response.text()
      if (!response.ok) {
        let parsedMessage = payloadText
        try {
          parsedMessage =
            (JSON.parse(payloadText) as { message?: string }).message ||
            payloadText
        } catch {
          // Keep raw text.
        }
        throw new Error(parsedMessage || '合併上游失敗')
      }
      try {
        message =
          (JSON.parse(payloadText) as { message?: string }).message || '已合併'
      } catch {
        message = '已合併'
      }
    } else {
      const response = await githubApiFetch(
        token,
        `/repos/${targetRepo.owner}/${targetRepo.repo}/merges`,
        {
          method: 'POST',
          body: JSON.stringify({
            base: branchName,
            head: sourceRepo.defaultBranch,
            commit_message: `Merge ${sourceRepo.owner}/${sourceRepo.repo}:${sourceRepo.defaultBranch} into ${branchName}`,
          }),
        }
      )
      if (response.status === 204) {
        message = '已是最新狀態'
      } else {
        const payloadJson = (await response.json()) as { message?: string }
        if (!response.ok) {
          throw new Error(payloadJson.message || '合併上游失敗')
        }
        message = payloadJson.message || '已合併'
      }
    }

    return json({
      ok: true,
      branchName,
      message,
    })
  } catch (error) {
    return json(
      {
        error: 'merge_failed',
        message: error instanceof Error ? error.message : '合併上游失敗',
      },
      { status: 502 }
    )
  }
}
