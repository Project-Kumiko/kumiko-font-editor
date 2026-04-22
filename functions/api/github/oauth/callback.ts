import {
  clearStateCookieHeader,
  createSessionCookieHeader,
  readOAuthState,
  type AccessTokenResponse,
  type Env,
} from '../_utils'

const redirectWithStatus = (origin: string, status: string, extraCookies: string[] = []) => {
  const headers = new Headers({
    Location: `${origin}/?github_oauth=${encodeURIComponent(status)}`,
  })
  for (const cookie of extraCookies) {
    headers.append('Set-Cookie', cookie)
  }

  return new Response(null, {
    status: 302,
    headers,
  })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GITHUB_CLIENT_ID?.trim()
  const clientSecret = context.env.GITHUB_CLIENT_SECRET?.trim()
  const requestUrl = new URL(context.request.url)
  const origin = requestUrl.origin

  if (!clientId || !clientSecret) {
    return redirectWithStatus(origin, 'missing-config', [clearStateCookieHeader()])
  }

  const code = requestUrl.searchParams.get('code')?.trim()
  const state = requestUrl.searchParams.get('state')?.trim()
  const storedState = readOAuthState(context.request)

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithStatus(origin, 'invalid-state', [clearStateCookieHeader()])
  }

  const exchangeBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: `${origin}/api/github/oauth/callback`,
  })

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: exchangeBody.toString(),
  })

  const payload = (await response.json()) as
    | AccessTokenResponse
    | { error?: string; error_description?: string }

  if (!response.ok || !('access_token' in payload)) {
    return redirectWithStatus(origin, payload.error ?? 'oauth-error', [clearStateCookieHeader()])
  }

  const sessionCookie = await createSessionCookieHeader(context.env, {
    accessToken: payload.access_token,
  })

  return redirectWithStatus(origin, 'success', [
    clearStateCookieHeader(),
    sessionCookie,
  ])
}
