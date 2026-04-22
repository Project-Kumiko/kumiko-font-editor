interface ProjectGlyphSummary {
  id: string
  name: string
  unicode: string | null
}

interface SearchSuccessMessage {
  type: 'search-success'
  payload: {
    requestId: string
    components: string[]
    activeComponent: string | null
    glyphIds: string[]
  }
}

interface SearchErrorMessage {
  type: 'search-error'
  payload: {
    requestId: string
    message: string
  }
}

type WorkerResponseMessage = SearchSuccessMessage | SearchErrorMessage

let workerInstance: Worker | null = null

const getWorker = () => {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/componentSearchWorker.ts', import.meta.url),
      {
        type: 'module',
      }
    )
  }

  return workerInstance
}

export const searchProjectGlyphsByComponent = async (input: {
  character: string
  selectedComponent?: string | null
  currentGlyphId?: string | null
  projectGlyphs: ProjectGlyphSummary[]
  signal?: AbortSignal
}) => {
  const worker = getWorker()
  const requestId = `component-search-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return new Promise<{
    components: string[]
    activeComponent: string | null
    glyphIds: string[]
  }>((resolve, reject) => {
    const handleMessage = (event: MessageEvent<WorkerResponseMessage>) => {
      if (event.data.payload.requestId !== requestId) {
        return
      }

      cleanup()
      if (event.data.type === 'search-success') {
        resolve(event.data.payload)
        return
      }

      reject(new Error(event.data.payload.message))
    }

    const handleAbort = () => {
      worker.postMessage({
        type: 'cancel-search',
        payload: { requestId },
      })
      cleanup()
      reject(new DOMException('Search aborted', 'AbortError'))
    }

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      input.signal?.removeEventListener('abort', handleAbort)
    }

    worker.addEventListener('message', handleMessage)
    input.signal?.addEventListener('abort', handleAbort, { once: true })

    worker.postMessage({
      type: 'search-components',
      payload: {
        requestId,
        character: input.character,
        selectedComponent: input.selectedComponent,
        currentGlyphId: input.currentGlyphId,
        projectGlyphs: input.projectGlyphs,
      },
    })
  })
}
