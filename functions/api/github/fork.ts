import type { PagesFunction } from '../../pages'
import {
  createViewerForkRepo,
  getCanonicalSourceRepo,
  json,
  listRepoBranches,
  parseRepoInput,
  readGitHubAccessToken,
  type Env,
} from './_utils'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const token = await readGitHubAccessToken(context.request, context.env)
  if (!token) {
    return json(
      { error: 'missing_token', message: '請先登入 GitHub。' },
      { status: 401 }
    )
  }

  let payload: { repo?: string }
  try {
    payload = (await context.request.json()) as { repo?: string }
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
    const forkInfo = await createViewerForkRepo(
      token,
      sourceRepo.owner,
      sourceRepo.repo
    )
    const branches = forkInfo.targetRepo
      ? await listRepoBranches(
          token,
          forkInfo.targetRepo.owner,
          forkInfo.targetRepo.repo
        )
      : []

    return json({
      ok: true,
      viewerLogin: forkInfo.viewerLogin,
      sourceRepo,
      targetRepo: forkInfo.targetRepo,
      forked: forkInfo.forked,
      canDirectCommit: forkInfo.canDirectCommit,
      branches,
      selectedBranch:
        forkInfo.targetRepo?.defaultBranch ||
        sourceRepo.defaultBranch ||
        branches[0] ||
        null,
    })
  } catch (error) {
    return json(
      {
        error: 'fork_failed',
        message: error instanceof Error ? error.message : '建立 fork 失敗',
      },
      { status: 502 }
    )
  }
}
