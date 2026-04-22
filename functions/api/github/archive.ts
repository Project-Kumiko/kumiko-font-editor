import {
  buildArchiveAttempts,
  fetchRepoMetadata,
  json,
  parseRepoInput,
  readGitHubAccessToken,
  type Env,
} from './_utils'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  let parsed: { owner: string; repo: string }

  try {
    parsed = parseRepoInput(url.searchParams.get('repo'))
  } catch (error) {
    return json(
      {
        error: 'invalid_repo',
        message: error instanceof Error ? error.message : 'repo 參數格式錯誤',
      },
      { status: 400 }
    )
  }

  const token = await readGitHubAccessToken(context.request, context.env)
  const explicitRef = url.searchParams.get('ref')?.trim() || null

  let defaultBranch: string | null = null
  if (!explicitRef) {
    try {
      const metadata = await fetchRepoMetadata({
        ...parsed,
        token,
      })
      defaultBranch = metadata.defaultBranch
    } catch {
      defaultBranch = null
    }
  }

  const attempts = buildArchiveAttempts({
    ...parsed,
    explicitRef,
    defaultBranch,
    token,
  })

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      headers:
        attempt.useAuth && token
          ? {
              Accept: 'application/vnd.github+json',
              Authorization: `Bearer ${token}`,
              'X-GitHub-Api-Version': '2022-11-28',
            }
          : undefined,
      redirect: 'follow',
    })

    if (!response.ok) {
      continue
    }

    const contentType =
      response.headers.get('content-type') ?? 'application/zip'
    const archiveBuffer = await response.arrayBuffer()
    return new Response(archiveBuffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
        'x-kumiko-github-ref': attempt.ref,
        'x-kumiko-github-url': attempt.url,
      },
    })
  }

  return json(
    explicitRef
      ? {
          error: 'archive_not_found',
          message: '找不到指定的 branch、tag 或 commit 對應的 GitHub ZIP 檔',
        }
      : {
          error: 'archive_not_found',
          message:
            '無法自動判斷這個 repo 的預設分支。請手動輸入 branch、tag 或 commit 再試一次。',
        },
    { status: 404 }
  )
}
