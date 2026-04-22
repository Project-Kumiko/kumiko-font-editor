export interface GitHubViewer {
  login: string | null
  name: string | null
  profileUrl: string | null
  avatarUrl: string | null
}

const parseResponseBody = async (response: Response) => {
  const rawText = await response.text()
  if (!rawText.trim()) {
    return null
  }

  try {
    return JSON.parse(rawText) as { message?: string }
  } catch {
    return {
      message: rawText.slice(0, 200),
    }
  }
}

const readJsonOrThrow = async <T>(response: Response) => {
  const payload = (await parseResponseBody(response)) as (T & { message?: string }) | null
  if (!payload) {
    throw new Error(
      response.ok
        ? 'API 沒有回傳 JSON。若你在本地開發，請改用 `pnpm cf:dev` 啟動 Cloudflare Pages Functions。'
        : `HTTP ${response.status}`
    )
  }
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`)
  }
  return payload
}

export const startGitHubOAuthLogin = () => {
  window.location.href = '/api/github/oauth/start'
}

export const fetchGitHubViewer = async () => {
  const response = await fetch('/api/github/viewer', {
    credentials: 'include',
  })
  return readJsonOrThrow<GitHubViewer>(response)
}

export const logoutGitHubOAuth = async () => {
  const response = await fetch('/api/github/logout', {
    method: 'POST',
    credentials: 'include',
  })
  return readJsonOrThrow<{ ok: boolean }>(response)
}
