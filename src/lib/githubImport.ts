import { unzipSync } from 'fflate'
import { createGitHubAuthHeaders } from './githubAuth'
import { importUfoWorkspaceEntries, type UfoWorkspaceEntry } from './ufoFormat'
import type { UfoGithubSource } from './ufoTypes'

interface ParsedGitHubInput {
  owner: string
  repo: string
}

interface RepoMetadataResponse {
  title: string
  defaultBranch: string | null
  repoUrl: string
}

const GITHUB_REPO_PATTERN =
  /^(?:https?:\/\/github\.com\/)?(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+?)(?:\.git|\/)?$/

const normalizePath = (value: string) => value.replace(/\\/g, '/')

const parseGitHubRepoInput = (value: string): ParsedGitHubInput => {
  const trimmed = value.trim()
  const match = trimmed.match(GITHUB_REPO_PATTERN)
  const owner = match?.groups?.owner
  const repo = match?.groups?.repo

  if (!owner || !repo) {
    throw new Error('請輸入 `owner/repo` 或完整 GitHub repo URL')
  }

  return { owner, repo }
}

const decodeZipEntry = (path: string, bytes: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    throw new Error(
      `無法解碼 ZIP 內的文字檔：${path}。${error instanceof Error ? error.message : '未知錯誤'}`
    )
  }
}

const collectUfoEntriesFromZip = (zipBuffer: Uint8Array) => {
  const archiveEntries = unzipSync(zipBuffer)
  const rawPaths = Object.keys(archiveEntries).filter((path) => path.length > 0)
  const archiveRoot = rawPaths[0]?.split('/')[0] ?? ''
  const ufoEntries: UfoWorkspaceEntry[] = []

  for (const [rawPath, bytes] of Object.entries(archiveEntries)) {
    const normalizedPath = normalizePath(rawPath)
    if (!normalizedPath || normalizedPath.endsWith('/')) {
      continue
    }

    const relativePath =
      archiveRoot && normalizedPath.startsWith(`${archiveRoot}/`)
        ? normalizedPath.slice(archiveRoot.length + 1)
        : normalizedPath

    if (!relativePath.toLowerCase().includes('.ufo/')) {
      continue
    }

    const normalizedLower = relativePath.toLowerCase()
    if (
      !normalizedLower.endsWith('.glif') &&
      !normalizedLower.endsWith('.plist') &&
      !normalizedLower.endsWith('.fea')
    ) {
      continue
    }

    ufoEntries.push({
      relativePath,
      text: decodeZipEntry(relativePath, bytes),
    })
  }

  return { archiveRoot, ufoEntries }
}

const fetchJsonOrThrow = async <T>(response: Response) => {
  const payload = (await response.json()) as T & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`)
  }
  return payload
}

export const importGitHubRepo = async (input: {
  repo: string
  ref?: string
  accessToken?: string | null
}) => {
  const parsed = parseGitHubRepoInput(input.repo)
  const authHeaders = createGitHubAuthHeaders(input.accessToken)
  const metadataResponse = await fetch(
    `/api/github/repo?repo=${encodeURIComponent(`${parsed.owner}/${parsed.repo}`)}`,
    {
      headers: authHeaders,
    }
  )
  const repoMetadata = await fetchJsonOrThrow<RepoMetadataResponse>(metadataResponse)

  const archiveUrl = new URL('/api/github/archive', window.location.origin)
  archiveUrl.searchParams.set('repo', `${parsed.owner}/${parsed.repo}`)
  if (input.ref?.trim()) {
    archiveUrl.searchParams.set('ref', input.ref.trim())
  }

  const archiveResponse = await fetch(archiveUrl.toString(), {
    headers: authHeaders,
  })
  if (!archiveResponse.ok) {
    const payload = (await archiveResponse.json()) as { message?: string }
    throw new Error(payload.message || `下載 GitHub ZIP 失敗（HTTP ${archiveResponse.status}）`)
  }

  const zipBuffer = new Uint8Array(await archiveResponse.arrayBuffer())
  const resolvedRef =
    archiveResponse.headers.get('x-kumiko-github-ref') ??
    input.ref?.trim() ??
    repoMetadata.defaultBranch ??
    'unknown'
  const zipballUrl =
    archiveResponse.headers.get('x-kumiko-github-url') ??
    archiveUrl.toString()

  const { archiveRoot, ufoEntries } = collectUfoEntriesFromZip(zipBuffer)
  if (ufoEntries.length === 0) {
    throw new Error('這個 repo 的 ZIP 檔裡沒有找到可解析的 UFO 專案')
  }

  const githubSource: UfoGithubSource = {
    owner: parsed.owner,
    repo: parsed.repo,
    ref: resolvedRef,
    defaultBranch: repoMetadata.defaultBranch ?? resolvedRef,
    repoUrl: repoMetadata.repoUrl,
    zipballUrl,
    archiveRoot,
    commitSha: null,
  }

  return importUfoWorkspaceEntries(ufoEntries, {
    title: repoMetadata.title,
    sourceFolderName: `${parsed.owner}/${parsed.repo}`,
    sourceType: 'github',
    githubSource,
  })
}
