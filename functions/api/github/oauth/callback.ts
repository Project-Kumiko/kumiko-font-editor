import type { PagesFunction } from '../../../pages'
import {
  clearStateCookieHeader,
  createSessionCookieHeader,
  readOAuthState,
  type AccessTokenResponse,
  type Env,
} from '../_utils'

const redirectWithStatus = (
  origin: string,
  status: string,
  extraCookies: string[] = []
) => {
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

const popupResponse = (status: string, extraCookies: string[] = []) => {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
  })
  for (const cookie of extraCookies) {
    headers.append('Set-Cookie', cookie)
  }

  const html = `<!doctype html>
<html>
  <body>
    <script>
      (function() {
        const message = { type: 'kumiko-github-oauth', status: ${JSON.stringify(status)} };
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(message, window.location.origin);
        }
        window.close();
      })();
    </script>
    <p>GitHub OAuth 完成，這個視窗可以關閉。</p>
  </body>
</html>`

  return new Response(html, {
    status: 200,
    headers,
  })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GITHUB_CLIENT_ID?.trim()
  const clientSecret = context.env.GITHUB_CLIENT_SECRET?.trim()
  const requestUrl = new URL(context.request.url)
  const origin = requestUrl.origin
  const popupMode = requestUrl.searchParams.get('popup') === '1'

  if (!clientId || !clientSecret) {
    return popupMode
      ? popupResponse('missing-config', [clearStateCookieHeader()])
      : redirectWithStatus(origin, 'missing-config', [clearStateCookieHeader()])
  }

  const code = requestUrl.searchParams.get('code')?.trim()
  const state = requestUrl.searchParams.get('state')?.trim()
  const storedState = readOAuthState(context.request)

  if (!code || !state || !storedState || state !== storedState) {
    return popupMode
      ? popupResponse('invalid-state', [clearStateCookieHeader()])
      : redirectWithStatus(origin, 'invalid-state', [clearStateCookieHeader()])
  }

  const exchangeBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: `${origin}/api/github/oauth/callback${popupMode ? '?popup=1' : ''}`,
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
    return popupMode
      ? popupResponse(payload.error ?? 'oauth-error', [
          clearStateCookieHeader(),
        ])
      : redirectWithStatus(origin, payload.error ?? 'oauth-error', [
          clearStateCookieHeader(),
        ])
  }

  const sessionCookie = await createSessionCookieHeader(context.env, {
    accessToken: payload.access_token,
  })

  return popupMode
    ? popupResponse('success', [clearStateCookieHeader(), sessionCookie])
    : redirectWithStatus(origin, 'success', [
        clearStateCookieHeader(),
        sessionCookie,
      ])
}
