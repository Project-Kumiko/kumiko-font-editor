export interface PagesFunctionContext<Env = unknown> {
  request: Request
  env: Env
  params: Record<string, string>
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
  next: () => Promise<Response>
  data: Record<string, unknown>
}

export type PagesFunction<Env = unknown> = (
  context: PagesFunctionContext<Env>
) => Response | Promise<Response>
