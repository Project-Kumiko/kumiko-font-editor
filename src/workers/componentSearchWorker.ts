interface ProjectGlyphSummary {
  id: string
  name: string
  unicode: string | null
}

interface SearchComponentsMessage {
  type: 'search-components'
  payload: {
    requestId: string
    character: string
    selectedComponent?: string | null
    currentGlyphId?: string | null
    projectGlyphs: ProjectGlyphSummary[]
  }
}

interface CancelSearchMessage {
  type: 'cancel-search'
  payload: {
    requestId: string
  }
}

type WorkerRequestMessage = SearchComponentsMessage | CancelSearchMessage

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

const IDS_OPERATOR_MIN = 0x2ff0
const IDS_OPERATOR_MAX = 0x2ffb

let datasetPromise: Promise<{
  decompositionMap: Map<string, string[]>
  reverseIndex: Map<string, string[]>
}> | null = null

const cancelledRequests = new Set<string>()

const toCodePointArray = (value: string) => Array.from(value.replace(/^\uFEFF/, ''))

const shouldIgnoreCharacter = (character: string) => {
  const codePoint = character.codePointAt(0)
  return (
    !character ||
    character === '\t' ||
    character === ' ' ||
    character === '\r' ||
    character === '\n' ||
    (typeof codePoint === 'number' && codePoint >= IDS_OPERATOR_MIN && codePoint <= IDS_OPERATOR_MAX)
  )
}

const loadVariantMap = async () => {
  const response = await fetch('/hanseeker/data_vt.txt')
  if (!response.ok) {
    throw new Error(`無法載入 Hanseeker 異體資料：${response.status}`)
  }

  const text = await response.text()
  const variantMap = new Map<string, string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const [variant, canonical] = line.replace(/^\uFEFF/, '').split('\t')
    if (variant && canonical) {
      variantMap.set(variant, canonical)
    }
  }

  return variantMap
}

const parseDecompositionVariants = (payload: string, variantMap: Map<string, string>) => {
  const variants: string[][] = []
  let current = ''

  for (const character of toCodePointArray(payload)) {
    if (character === '@' || character === '!') {
      if (current) {
        variants.push(
          toCodePointArray(current)
            .filter((item) => !shouldIgnoreCharacter(item))
            .map((item) => variantMap.get(item) ?? item)
        )
      }
      current = ''
      continue
    }

    current += character
  }

  if (current) {
    variants.push(
      toCodePointArray(current)
        .filter((item) => !shouldIgnoreCharacter(item))
        .map((item) => variantMap.get(item) ?? item)
    )
  }

  return variants.filter((variant) => variant.length > 0)
}

const buildDataset = async () => {
  const [variantMap, dataResponse] = await Promise.all([
    loadVariantMap(),
    fetch('/hanseeker/data_nosupp.txt'),
  ])

  if (!dataResponse.ok) {
    throw new Error(`無法載入 Hanseeker 拆字資料：${dataResponse.status}`)
  }

  const dataText = await dataResponse.text()
  const decompositionMap = new Map<string, string[]>()
  const reverseIndex = new Map<string, Set<string>>()

  for (const rawLine of dataText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const characters = toCodePointArray(line)
    const target = characters[0]
    const payload = characters.slice(1).join('')
    if (!target || !payload) {
      continue
    }

    const variants = parseDecompositionVariants(payload, variantMap)
    if (variants.length === 0) {
      continue
    }

    if (!decompositionMap.has(target)) {
      decompositionMap.set(target, [...new Set(variants[0])])
    }

    const uniqueComponents = new Set(variants.flat())
    for (const component of uniqueComponents) {
      if (!reverseIndex.has(component)) {
        reverseIndex.set(component, new Set())
      }
      reverseIndex.get(component)?.add(target)
    }
  }

  return {
    decompositionMap,
    reverseIndex: new Map(
      [...reverseIndex.entries()].map(([component, characters]) => [component, [...characters]])
    ),
  }
}

const getDataset = () => {
  if (!datasetPromise) {
    datasetPromise = buildDataset()
  }
  return datasetPromise
}

const getGlyphCharacter = (glyph: ProjectGlyphSummary) => {
  if (glyph.unicode) {
    const codePoint = Number.parseInt(glyph.unicode, 16)
    if (Number.isFinite(codePoint)) {
      return String.fromCodePoint(codePoint)
    }
  }

  return Array.from(glyph.name ?? '').length === 1 ? glyph.name : null
}

const handleSearch = async (message: SearchComponentsMessage) => {
  const requestId = message.payload.requestId
  const dataset = await getDataset()
  if (cancelledRequests.has(requestId)) {
    cancelledRequests.delete(requestId)
    return
  }

  const components = dataset.decompositionMap.get(message.payload.character) ?? []
  const activeComponent =
    message.payload.selectedComponent && components.includes(message.payload.selectedComponent)
      ? message.payload.selectedComponent
      : (components[0] ?? null)

  const matchingCharacters = activeComponent
    ? new Set(dataset.reverseIndex.get(activeComponent) ?? [])
    : new Set<string>()

  const glyphIds = message.payload.projectGlyphs
    .filter((glyph) => glyph.id !== message.payload.currentGlyphId)
    .filter((glyph) => {
      const character = getGlyphCharacter(glyph)
      return character ? matchingCharacters.has(character) : false
    })
    .map((glyph) => glyph.id)
    .sort((left, right) => left.localeCompare(right))

  if (cancelledRequests.has(requestId)) {
    cancelledRequests.delete(requestId)
    return
  }

  ;(self as DedicatedWorkerGlobalScope).postMessage({
    type: 'search-success',
    payload: {
      requestId,
      components,
      activeComponent,
      glyphIds,
    },
  } satisfies WorkerResponseMessage)
}

self.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  if (event.data.type === 'cancel-search') {
    cancelledRequests.add(event.data.payload.requestId)
    return
  }

  void handleSearch(event.data).catch((error) => {
    ;(self as DedicatedWorkerGlobalScope).postMessage({
      type: 'search-error',
      payload: {
        requestId: event.data.payload.requestId,
        message: error instanceof Error ? error.message : '部件搜尋失敗',
      },
    } satisfies WorkerResponseMessage)
  })
}
