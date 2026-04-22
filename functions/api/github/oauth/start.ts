import {
  createOAuthState,
  createStateCookieHeader,
  type Env,
} from '../_utils'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GITHUB_CLIENT_ID?.trim()
  if (!clientId) {
    return new Response('Cloudflare 環境變數 GITHUB_CLIENT_ID 尚未設定', { status: 500 })
  }

  const requestUrl = new URL(context.request.url)
  const redirectUri = `${requestUrl.origin}/api/github/oauth/callback`
  const scope = context.env.GITHUB_OAUTH_SCOPE?.trim() || 'public_repo read:user user:email'
  const state = createOAuthState()

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('scope', scope)
  authorizeUrl.searchParams.set('state', state)

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': createStateCookieHeader(state),
    },
  })
}
