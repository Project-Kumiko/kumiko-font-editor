export interface Env {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GITHUB_OAUTH_SCOPE?: string
}

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface AccessTokenSuccessResponse {
  access_token: string
  token_type: string
  scope: string
}

export interface AccessTokenErrorResponse {
  error: string
  error_description?: string
  error_uri?: string
  interval?: number
}

export interface RepoMetadataResponse {
  title: string
  defaultBranch: string | null
  repoUrl: string
}

export const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  })

export const readBearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim() ?? ''
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null
  }
  return authorization.slice('bearer '.length).trim() || null
}

export const parseRepoInput = (value: string | null) => {
  if (!value) {
    throw new Error('缺少 repo 參數')
  }

  const trimmed = value.trim()
  const normalized = trimmed.replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '')
  const segments = normalized.split('/').filter(Boolean)

  if (segments.length < 2) {
    throw new Error('repo 參數必須是 owner/repo 或 GitHub repo URL')
  }

  return {
    owner: segments[0]!,
    repo: segments[1]!.replace(/\.git$/i, ''),
  }
}

const DEFAULT_REF_CANDIDATES = ['main', 'master']

const parseDefaultBranchFromHtml = (html: string) => {
  const patterns = [
    /"defaultBranch":"([^"]+)"/,
    /octolytics-dimension-repository_default_branch" content="([^"]+)"/,
    /"default_branch":"([^"]+)"/,
    /\/commits\/([A-Za-z0-9._/-]+)"/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    const value = match?.[1]?.trim()
    if (value) {
      return value
    }
  }

  return null
}

const parseRepoTitleFromHtml = (html: string, fallbackRepo: string) => {
  const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i)
  const ogTitle = ogTitleMatch?.[1]?.trim()
  if (!ogTitle) {
    return fallbackRepo
  }

  const [repoTitle] = ogTitle.split(':')
  return repoTitle?.split('/').pop()?.trim() || fallbackRepo
}

export const fetchRepoMetadata = async (input: {
  owner: string
  repo: string
  token?: string | null
}): Promise<RepoMetadataResponse> => {
  if (input.token) {
    const response = await fetch(`https://api.github.com/repos/${input.owner}/${input.repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${input.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (response.ok) {
      const payload = (await response.json()) as {
        default_branch?: string
        html_url?: string
        name?: string
      }
      return {
        title: payload.name ?? input.repo,
        defaultBranch: payload.default_branch ?? null,
        repoUrl: payload.html_url ?? `https://github.com/${input.owner}/${input.repo}`,
      }
    }
  }

  const repoUrl = `https://github.com/${input.owner}/${input.repo}`
  const response = await fetch(repoUrl)
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? '找不到指定的 GitHub repo，請確認 owner/repo 是否正確'
        : `讀取 GitHub repo 頁面失敗（HTTP ${response.status}）`
    )
  }

  const html = await response.text()
  return {
    title: parseRepoTitleFromHtml(html, input.repo),
    defaultBranch: parseDefaultBranchFromHtml(html),
    repoUrl: response.url || repoUrl,
  }
}

export const buildArchiveAttempts = (input: {
  owner: string
  repo: string
  explicitRef?: string | null
  defaultBranch?: string | null
  token?: string | null
}) => {
  const refsToTry = input.explicitRef?.trim()
    ? [input.explicitRef.trim()]
    : [input.defaultBranch, ...DEFAULT_REF_CANDIDATES].filter(
        (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index
      )

  const attempts: Array<{ ref: string; url: string; useAuth: boolean }> = []
  for (const ref of refsToTry) {
    if (input.token) {
      attempts.push({
        ref,
        url: `https://api.github.com/repos/${input.owner}/${input.repo}/zipball/${encodeURIComponent(ref)}`,
        useAuth: true,
      })
    }

    attempts.push({
      ref,
      url: `https://codeload.github.com/${input.owner}/${input.repo}/zip/refs/heads/${encodeURIComponent(ref)}`,
      useAuth: false,
    })
    attempts.push({
      ref,
      url: `https://codeload.github.com/${input.owner}/${input.repo}/zip/refs/tags/${encodeURIComponent(ref)}`,
      useAuth: false,
    })
    attempts.push({
      ref,
      url: `https://github.com/${input.owner}/${input.repo}/archive/${encodeURIComponent(ref)}.zip`,
      useAuth: false,
    })
  }

  return attempts
}
