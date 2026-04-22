import { json, readBearerToken } from './_utils'

export const onRequestGet: PagesFunction = async (context) => {
  const token = readBearerToken(context.request)
  if (!token) {
    return json({ error: 'missing_token', message: '缺少 GitHub access token' }, { status: 401 })
  }

  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!response.ok) {
    return json(
      { error: 'viewer_fetch_failed', message: `讀取 GitHub 使用者資訊失敗（HTTP ${response.status}）` },
      { status: response.status }
    )
  }

  const payload = (await response.json()) as {
    login?: string
    avatar_url?: string
    html_url?: string
    name?: string | null
  }

  return json({
    login: payload.login ?? null,
    avatarUrl: payload.avatar_url ?? null,
    profileUrl: payload.html_url ?? null,
    name: payload.name ?? null,
  })
}
