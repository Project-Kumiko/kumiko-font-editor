import { json, type DeviceCodeResponse, type Env } from '../_utils'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return json(
      { error: 'missing_client_id', message: 'Cloudflare 環境變數 GITHUB_CLIENT_ID 尚未設定' },
      { status: 500 }
    )
  }

  const scope = context.env.GITHUB_OAUTH_SCOPE?.trim() || 'public_repo read:user user:email'
  const body = new URLSearchParams({
    client_id: clientId,
    scope,
  })

  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const payload = (await response.json()) as DeviceCodeResponse | { error?: string }
  if (!response.ok || !('device_code' in payload)) {
    return json(
      {
        error: 'device_flow_start_failed',
        message: '無法向 GitHub 啟動 Device Flow',
        details: payload,
      },
      { status: response.status || 502 }
    )
  }

  return json(payload)
}
