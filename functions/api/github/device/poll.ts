import {
  json,
  type AccessTokenErrorResponse,
  type AccessTokenSuccessResponse,
  type Env,
} from '../_utils'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return json(
      { error: 'missing_client_id', message: 'Cloudflare 環境變數 GITHUB_CLIENT_ID 尚未設定' },
      { status: 500 }
    )
  }

  let payload: { deviceCode?: string } | null = null
  try {
    payload = (await context.request.json()) as { deviceCode?: string }
  } catch {
    return json({ error: 'invalid_json', message: '請求 body 必須是 JSON' }, { status: 400 })
  }

  const deviceCode = payload?.deviceCode?.trim()
  if (!deviceCode) {
    return json({ error: 'missing_device_code', message: '缺少 deviceCode' }, { status: 400 })
  }

  const body = new URLSearchParams({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const result = (await response.json()) as
    | AccessTokenSuccessResponse
    | AccessTokenErrorResponse

  if ('access_token' in result) {
    return json({
      status: 'authorized',
      accessToken: result.access_token,
      tokenType: result.token_type,
      scope: result.scope,
    })
  }

  if (result.error === 'authorization_pending' || result.error === 'slow_down') {
    return json(
      {
        status: result.error,
        interval: result.interval ?? null,
        message: result.error_description ?? null,
      },
      { status: 200 }
    )
  }

  return json(
    {
      status: 'error',
      error: result.error ?? 'oauth_error',
      message: result.error_description ?? 'GitHub Device Flow 輪詢失敗',
    },
    { status: response.status || 502 }
  )
}
