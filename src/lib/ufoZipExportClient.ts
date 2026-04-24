interface ZipExportProgress {
  completed: number
  total: number
  phase: 'write' | 'zip'
}

interface ZipExportResult {
  totalGlyphs: number
}

export const exportUfoAsZipDownload = async (input: {
  projectId: string
  fileName: string
  markClean?: boolean
  fixedConcurrency?: number
  onProgress?: (progress: ZipExportProgress) => void
}): Promise<ZipExportResult> => {
  return new Promise<ZipExportResult>((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/ufoZipExportWorker.ts', import.meta.url),
      { type: 'module' }
    )

    let result: ZipExportResult | null = null

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data

      if (data.type === 'zip-progress') {
        input.onProgress?.(data.payload)
        return
      }

      if (data.type === 'zip-success') {
        result = data.payload
        // Don't resolve yet — wait for zip-blob
        return
      }

      if (data.type === 'zip-blob') {
        worker.terminate()
        const buffer = data.payload.buffer as ArrayBuffer
        const blob = new Blob([buffer], { type: 'application/zip' })
        triggerBlobDownload(blob, input.fileName)
        resolve(result ?? { totalGlyphs: 0 })
        return
      }

      if (data.type === 'zip-error') {
        worker.terminate()
        reject(new Error(data.payload.message))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'UFO zip export worker failed'))
    }

    worker.postMessage({
      type: 'zip-export',
      payload: {
        projectId: input.projectId,
        markClean: input.markClean,
        fixedConcurrency: input.fixedConcurrency,
      },
    })
  })
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  // Clean up after a short delay so the browser has time to initiate the download
  setTimeout(() => {
    URL.revokeObjectURL(url)
    anchor.remove()
  }, 5000)
}
