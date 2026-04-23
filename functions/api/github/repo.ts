import type { PagesFunction } from '../../pages'
import {
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

  try {
    const metadata = await fetchRepoMetadata({
      ...parsed,
      token: await readGitHubAccessToken(context.request, context.env),
    })
    return json(metadata)
  } catch (error) {
    return json(
      {
        error: 'repo_metadata_failed',
        message:
          error instanceof Error ? error.message : '讀取 repo metadata 失敗',
      },
      { status: 502 }
    )
  }
}
