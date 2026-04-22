export interface Env {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GITHUB_SESSION_SECRET?: string
  GITHUB_OAUTH_SCOPE?: string
}

export interface AccessTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

export interface RepoMetadataResponse {
  title: string
  defaultBranch: string | null
  repoUrl: string
}

interface GitHubSessionPayload {
  accessToken: string
}

const GITHUB_SESSION_COOKIE = 'kumiko_github_session'
const GITHUB_STATE_COOKIE = 'kumiko_github_oauth_state'

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

const encodeBase64Url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(`${normalized}${padding}`)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const signValue = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value))
  return encodeBase64Url(new Uint8Array(signature))
}

const parseCookies = (request: Request) => {
  const rawCookie = request.headers.get('cookie') ?? ''
  return Object.fromEntries(
    rawCookie
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf('=')
        if (separatorIndex < 0) {
          return [entry, '']
        }
        return [entry.slice(0, separatorIndex), decodeURIComponent(entry.slice(separatorIndex + 1))]
      })
  )
}

const serializeCookie = (name: string, value: string, options?: {
  maxAge?: number
  httpOnly?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  secure?: boolean
  path?: string
}) => {
  const segments = [`${name}=${encodeURIComponent(value)}`]
  segments.push(`Path=${options?.path ?? '/'}`)
  segments.push(`SameSite=${options?.sameSite ?? 'Lax'}`)
  if (options?.maxAge !== undefined) {
    segments.push(`Max-Age=${options.maxAge}`)
  }
  if (options?.httpOnly ?? true) {
    segments.push('HttpOnly')
  }
  if (options?.secure ?? true) {
    segments.push('Secure')
  }
  return segments.join('; ')
}

const clearCookieHeader = (name: string) =>
  serializeCookie(name, '', {
    maxAge: 0,
  })

const randomHex = (byteLength = 16) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export const createOAuthState = () => randomHex(18)

export const createStateCookieHeader = (state: string) =>
  serializeCookie(GITHUB_STATE_COOKIE, state, {
    maxAge: 600,
  })

export const clearStateCookieHeader = () => clearCookieHeader(GITHUB_STATE_COOKIE)

export const readOAuthState = (request: Request) => parseCookies(request)[GITHUB_STATE_COOKIE] ?? null

export const createSessionCookieHeader = async (env: Env, payload: GitHubSessionPayload) => {
  const secret = env.GITHUB_SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error('Cloudflare 環境變數 GITHUB_SESSION_SECRET 尚未設定')
  }

  const encodedPayload = encodeBase64Url(textEncoder.encode(JSON.stringify(payload)))
  const signature = await signValue(secret, encodedPayload)
  return serializeCookie(GITHUB_SESSION_COOKIE, `${encodedPayload}.${signature}`, {
    maxAge: 60 * 60 * 24 * 7,
  })
}

export const clearSessionCookieHeader = () => clearCookieHeader(GITHUB_SESSION_COOKIE)

const readSessionPayload = async (request: Request, env: Env): Promise<GitHubSessionPayload | null> => {
  const secret = env.GITHUB_SESSION_SECRET?.trim()
  if (!secret) {
    return null
  }

  const rawValue = parseCookies(request)[GITHUB_SESSION_COOKIE]
  if (!rawValue) {
    return null
  }

  const [encodedPayload, providedSignature] = rawValue.split('.')
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = await signValue(secret, encodedPayload)
  if (expectedSignature !== providedSignature) {
    return null
  }

  try {
    return JSON.parse(textDecoder.decode(decodeBase64Url(encodedPayload))) as GitHubSessionPayload
  } catch {
    return null
  }
}

export const readGitHubAccessToken = async (request: Request, env: Env) => {
  const bearerToken = readBearerToken(request)
  if (bearerToken) {
    return bearerToken
  }

  const sessionPayload = await readSessionPayload(request, env)
  return sessionPayload?.accessToken ?? null
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
