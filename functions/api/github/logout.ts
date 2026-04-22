import { clearSessionCookieHeader, json } from './_utils'

export const onRequestPost: PagesFunction = async () => {
  return json(
    {
      ok: true,
    },
    {
      headers: {
        'Set-Cookie': clearSessionCookieHeader(),
      },
    }
  )
}
