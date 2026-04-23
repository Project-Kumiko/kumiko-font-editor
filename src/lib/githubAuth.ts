export interface GitHubViewer {
  login: string | null
  name: string | null
  profileUrl: string | null
  avatarUrl: string | null
}

export interface GitHubRepoSummary {
  owner: string
  repo: string
  fullName: string
  defaultBranch: string
  htmlUrl: string
  canPush: boolean
}

export interface GitHubCompareStatus {
  status: string
  aheadBy: number
  behindBy: number
  compareUrl: string
}

export interface GitHubForkStatus {
  viewerLogin: string
  sourceRepo: GitHubRepoSummary
  targetRepo: GitHubRepoSummary | null
  forked: boolean
  canDirectCommit: boolean
  branches: string[]
  selectedBranch: string | null
  compare: GitHubCompareStatus | null
}

export interface GitHubCompareStatusResponse {
  sourceRepo: GitHubRepoSummary
  compare: GitHubCompareStatus
}

const GITHUB_OAUTH_POPUP_EVENT = 'kumiko-github-oauth'

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
  const payload = (await parseResponseBody(response)) as
    | (T & { message?: string })
    | null
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
  const popup = window.open(
    '/api/github/oauth/start?popup=1',
    'kumiko-github-oauth',
    'popup=yes,width=640,height=760,resizable=yes,scrollbars=yes'
  )

  if (!popup) {
    throw new Error('無法開啟 GitHub 登入視窗，請確認瀏覽器沒有擋住 popup。')
  }

  popup.focus()

  return new Promise<void>((resolve, reject) => {
    const pollTimer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(pollTimer)
        window.removeEventListener('message', handleMessage)
        reject(new Error('GitHub 登入視窗已關閉'))
      }
    }, 500)

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      const data = event.data as { type?: string; status?: string } | null
      if (!data || data.type !== GITHUB_OAUTH_POPUP_EVENT) {
        return
      }

      window.clearInterval(pollTimer)
      window.removeEventListener('message', handleMessage)

      if (data.status === 'success') {
        resolve()
        return
      }

      reject(new Error(`GitHub OAuth 流程失敗：${data.status ?? 'unknown'}`))
    }

    window.addEventListener('message', handleMessage)
  })
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

export const fetchGitHubForkStatus = async (repo: string, branch?: string) => {
  const url = new URL('/api/github/fork-status', window.location.origin)
  url.searchParams.set('repo', repo)
  if (branch?.trim()) {
    url.searchParams.set('branch', branch.trim())
  }
  const response = await fetch(url.toString(), {
    credentials: 'include',
  })
  return readJsonOrThrow<GitHubForkStatus>(response)
}

export const createGitHubFork = async (repo: string) => {
  const response = await fetch('/api/github/fork', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repo }),
  })
  return readJsonOrThrow<GitHubForkStatus & { ok: boolean }>(response)
}

export const fetchGitHubCompareStatus = async (input: {
  repo: string
  headOwner: string
  headBranch: string
}) => {
  const url = new URL('/api/github/compare-status', window.location.origin)
  url.searchParams.set('repo', input.repo)
  url.searchParams.set('headOwner', input.headOwner)
  url.searchParams.set('headBranch', input.headBranch)
  const response = await fetch(url.toString(), {
    credentials: 'include',
  })
  return readJsonOrThrow<GitHubCompareStatusResponse>(response)
}

export const mergeGitHubUpstream = async (input: {
  repo: string
  branchName: string
}) => {
  const response = await fetch('/api/github/merge', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  return readJsonOrThrow<{
    ok: boolean
    branchName: string
    message: string
  }>(response)
}

export const createGitHubCommit = async (payload: {
  repo: string
  baseBranch: string
  commitMessage: string
  branchName?: string
  files: Array<{
    path: string
    content?: string
    deleted?: boolean
  }>
}) => {
  const response = await fetch('/api/github/commit', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return readJsonOrThrow<{
    ok: boolean
    branchName: string
    headOwner: string
    commitSha: string
    compare: GitHubCompareStatus
  }>(response)
}
