const GITHUB_ACCESS_TOKEN_KEY = 'kumiko.github.accessToken'

export interface GitHubViewer {
  login: string | null
  name: string | null
  profileUrl: string | null
  avatarUrl: string | null
}

export interface GitHubDeviceStartPayload {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface GitHubDevicePollAuthorizedPayload {
  status: 'authorized'
  accessToken: string
  tokenType: string
  scope: string
}

interface GitHubDevicePollPendingPayload {
  status: 'authorization_pending' | 'slow_down'
  interval: number | null
  message: string | null
}

interface GitHubDevicePollErrorPayload {
  status: 'error'
  error: string
  message: string
}

export type GitHubDevicePollPayload =
  | GitHubDevicePollAuthorizedPayload
  | GitHubDevicePollPendingPayload
  | GitHubDevicePollErrorPayload

const readJsonOrThrow = async <T>(response: Response) => {
  const payload = (await response.json()) as T & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`)
  }
  return payload
}

export const getStoredGitHubAccessToken = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.sessionStorage.getItem(GITHUB_ACCESS_TOKEN_KEY)
}

export const setStoredGitHubAccessToken = (token: string) => {
  window.sessionStorage.setItem(GITHUB_ACCESS_TOKEN_KEY, token)
}

export const clearStoredGitHubAccessToken = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.sessionStorage.removeItem(GITHUB_ACCESS_TOKEN_KEY)
}

export const createGitHubAuthHeaders = (token: string | null | undefined) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined

export const startGitHubDeviceFlow = async () => {
  const response = await fetch('/api/github/device/start', {
    method: 'POST',
  })
  return readJsonOrThrow<GitHubDeviceStartPayload>(response)
}

export const pollGitHubDeviceFlow = async (deviceCode: string) => {
  const response = await fetch('/api/github/device/poll', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceCode,
    }),
  })
  return readJsonOrThrow<GitHubDevicePollPayload>(response)
}

export const fetchGitHubViewer = async (token: string) => {
  const response = await fetch('/api/github/viewer', {
    headers: createGitHubAuthHeaders(token),
  })
  return readJsonOrThrow<GitHubViewer>(response)
}
