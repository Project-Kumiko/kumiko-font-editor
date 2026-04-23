import type { PagesFunction } from '../../pages'
import {
  getGitHubViewer,
  json,
  readGitHubAccessToken,
  type Env,
} from './_utils'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const token = await readGitHubAccessToken(context.request, context.env)
  if (!token) {
    return json(
      { error: 'missing_token', message: '缺少 GitHub access token' },
      { status: 401 }
    )
  }

  try {
    const payload = await getGitHubViewer(token)
    return json({
      login: payload.login ?? null,
      avatarUrl: payload.avatar_url ?? null,
      profileUrl: payload.html_url ?? null,
      name: payload.name ?? null,
    })
  } catch (error) {
    return json(
      {
        error: 'viewer_fetch_failed',
        message:
          error instanceof Error ? error.message : '讀取 GitHub 使用者資訊失敗',
      },
      { status: 502 }
    )
  }
}
