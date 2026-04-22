interface PagesFunction<Env = unknown> {
  (context: {
    request: Request
    env: Env
    params: Record<string, string>
    waitUntil: (promise: Promise<unknown>) => void
    passThroughOnException: () => void
    next: () => Promise<Response>
    data: Record<string, unknown>
  }): Response | Promise<Response>
}
