/// <reference lib="webworker" />

import { makeRuntimeNotConfiguredResponse } from 'src/lib/openTypeFeatures/compilerRuntimePlan'
import type { CompileRequestMessage } from 'src/lib/openTypeFeatures/compilerTypes'

self.onmessage = async (event: MessageEvent<CompileRequestMessage>) => {
  if (event.data?.type !== 'compile-font-features') {
    return
  }

  self.postMessage(makeRuntimeNotConfiguredResponse())
}

export {}
