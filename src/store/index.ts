import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal, type TemporalState } from 'zundo'

export type NodeType = 'corner' | 'smooth'

export interface PathNode {
  id: string
  x: number
  y: number
  type: NodeType
}

export interface PathData {
  id: string
  nodes: PathNode[]
  closed: boolean
}

export interface GlyphComponentRef {
  id: string
  glyphId: string
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
}

export interface GlyphMetrics {
  lsb: number
  rsb: number
  width: number
}

export interface GlyphData {
  id: string
  name: string
  paths: PathData[]
  components: string[]
  componentRefs: GlyphComponentRef[]
  metrics: GlyphMetrics
}

export interface FontData {
  glyphs: Record<string, GlyphData>
}

export interface SelectedNodeRef {
  pathId: string
  nodeId: string
}

export interface ViewportState {
  zoom: number
  pan: { x: number; y: number }
}

export interface GlobalState {
  fontData: FontData | null
  projectId: string | null
  projectTitle: string
  idsDictionary: Record<string, string[]>
  currentSearchQuery: string
  filteredGlyphList: GlyphData[]
  selectedGlyphId: string | null
  selectedLayerId: string | null
  selectedNodeIds: string[]
  viewport: ViewportState

  setSearchQuery: (query: string) => void
  setSelectedGlyphId: (id: string | null) => void
  setSelectedNodeIds: (ids: string[]) => void
  updateViewport: (zoom: number, panX: number, panY: number) => void
  updateNodePosition: (
    glyphId: string,
    pathId: string,
    nodeId: string,
    newPos: { x: number; y: number }
  ) => void
  updateNodePositions: (
    glyphId: string,
    updates: Array<{
      pathId: string
      nodeId: string
      newPos: { x: number; y: number }
    }>
  ) => void
  updateNodeType: (
    glyphId: string,
    pathId: string,
    nodeId: string,
    type: NodeType
  ) => void
  updateGlyphMetrics: (glyphId: string, metrics: Partial<GlyphMetrics>) => void
  loadProjectState: (id: string, title: string, fontData: FontData) => void
  closeProjectState: () => void
}

const IDS_DICTIONARY: Record<string, string[]> = {
  林: ['木', '木'],
  森: ['木', '木', '木'],
  果: ['日', '木'],
  樹: ['木', '尌'],
  機: ['木', '幾'],
}

const createNode = (
  id: string,
  x: number,
  y: number,
  type: NodeType = 'corner'
): PathNode => ({
  id,
  x,
  y,
  type,
})

const createMetrics = (width: number, lsb = 60, rsb = 60): GlyphMetrics => ({
  width,
  lsb,
  rsb,
})

const muGlyph: GlyphData = {
  id: 'uni6728',
  name: '木',
  components: [],
  componentRefs: [],
  metrics: createMetrics(820),
  paths: [
    {
      id: 'trunk',
      closed: false,
      nodes: [createNode('n0', 0, 730), createNode('n1', 0, 90)],
    },
    {
      id: 'leftSweep',
      closed: false,
      nodes: [createNode('n0', 0, 380), createNode('n1', -240, 170)],
    },
    {
      id: 'rightSweep',
      closed: false,
      nodes: [createNode('n0', 0, 380), createNode('n1', 250, 180)],
    },
    {
      id: 'crossBar',
      closed: false,
      nodes: [createNode('n0', -280, 520), createNode('n1', 280, 520)],
    },
  ],
}

const MOCK_FONT_DATA: FontData = {
  glyphs: {
    uni6728: muGlyph,
    uni6797: {
      id: 'uni6797',
      name: '林',
      paths: [],
      components: ['木', '木'],
      componentRefs: [
        {
          id: 'c0',
          glyphId: 'uni6728',
          x: -190,
          y: 0,
          scaleX: 0.9,
          scaleY: 1,
          rotation: 0,
        },
        {
          id: 'c1',
          glyphId: 'uni6728',
          x: 190,
          y: 0,
          scaleX: 0.9,
          scaleY: 1,
          rotation: 0,
        },
      ],
      metrics: createMetrics(1000),
    },
    uni68EE: {
      id: 'uni68EE',
      name: '森',
      paths: [],
      components: ['木', '木', '木'],
      componentRefs: [
        {
          id: 'c0',
          glyphId: 'uni6728',
          x: 0,
          y: 160,
          scaleX: 0.74,
          scaleY: 0.74,
          rotation: 0,
        },
        {
          id: 'c1',
          glyphId: 'uni6728',
          x: -220,
          y: -90,
          scaleX: 0.74,
          scaleY: 0.74,
          rotation: 0,
        },
        {
          id: 'c2',
          glyphId: 'uni6728',
          x: 220,
          y: -90,
          scaleX: 0.74,
          scaleY: 0.74,
          rotation: 0,
        },
      ],
      metrics: createMetrics(1020),
    },
    uni679C: {
      id: 'uni679C',
      name: '果',
      paths: [
        {
          id: 'outer',
          closed: true,
          nodes: [
            createNode('n0', -220, 740),
            createNode('n1', 220, 740),
            createNode('n2', 220, 270),
            createNode('n3', -220, 270),
          ],
        },
      ],
      components: ['日', '木'],
      componentRefs: [
        {
          id: 'c0',
          glyphId: 'uni6728',
          x: 0,
          y: -110,
          scaleX: 0.7,
          scaleY: 0.72,
          rotation: 0,
        },
      ],
      metrics: createMetrics(900),
    },
    uni6A39: {
      id: 'uni6A39',
      name: '樹',
      paths: [
        {
          id: 'marker',
          closed: false,
          nodes: [
            createNode('n0', 260, 680),
            createNode('n1', 260, 150, 'smooth'),
          ],
        },
      ],
      components: ['木', '尌'],
      componentRefs: [
        {
          id: 'c0',
          glyphId: 'uni6728',
          x: -170,
          y: 0,
          scaleX: 0.82,
          scaleY: 1,
          rotation: 0,
        },
      ],
      metrics: createMetrics(1040),
    },
    uni6A5F: {
      id: 'uni6A5F',
      name: '機',
      paths: [],
      components: ['木', '幾'],
      componentRefs: [
        {
          id: 'c0',
          glyphId: 'uni6728',
          x: -180,
          y: 0,
          scaleX: 0.84,
          scaleY: 1,
          rotation: 0,
        },
      ],
      metrics: createMetrics(1030),
    },
  },
}

for (let index = 0; index < 2500; index += 1) {
  MOCK_FONT_DATA.glyphs[`uni_mock_${index}`] = {
    id: `uni_mock_${index}`,
    name: `測試字形 ${index}`,
    paths: [],
    components: index % 3 === 0 ? ['木'] : index % 5 === 0 ? ['日', '木'] : [],
    componentRefs: [],
    metrics: createMetrics(900 + (index % 5) * 20),
  }
}

const getGlyphs = (fontData: FontData | null) =>
  Object.values(fontData?.glyphs ?? {})

const matchesIdsSearch = (
  glyph: GlyphData,
  query: string,
  idsDictionary: Record<string, string[]>
) => {
  const directIds = idsDictionary[glyph.name] ?? []
  return directIds.some((component) => component.toLowerCase().includes(query))
}

const filterGlyphs = (
  fontData: FontData | null,
  query: string,
  idsDictionary: Record<string, string[]>
) => {
  const glyphs = getGlyphs(fontData)
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return glyphs
  }

  return glyphs.filter((glyph) => {
    return (
      glyph.name.toLowerCase().includes(normalizedQuery) ||
      glyph.id.toLowerCase().includes(normalizedQuery) ||
      glyph.components.some((component) =>
        component.toLowerCase().includes(normalizedQuery)
      ) ||
      matchesIdsSearch(glyph, normalizedQuery, idsDictionary)
    )
  })
}

const syncFilteredGlyphList = (state: GlobalState) => {
  state.filteredGlyphList = filterGlyphs(
    state.fontData,
    state.currentSearchQuery,
    state.idsDictionary
  )
}

const findPath = (glyph: GlyphData, pathId: string) =>
  glyph.paths.find((path) => path.id === pathId)

const findNode = (path: PathData | undefined, nodeId: string) =>
  path?.nodes.find((node) => node.id === nodeId)

export const deterministicStringify = (value: unknown) => {
  const sortValue = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(sortValue)
    }

    if (input && typeof input === 'object') {
      return Object.keys(input as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((accumulator, key) => {
          accumulator[key] = sortValue((input as Record<string, unknown>)[key])
          return accumulator
        }, {})
    }

    return input
  }

  return JSON.stringify(sortValue(value), null, 2)
}

export const useStore = create<GlobalState>()(
  temporal(
    immer((set) => ({
      fontData: null,
      projectId: null,
      projectTitle: '',
      idsDictionary: IDS_DICTIONARY,
      currentSearchQuery: '',
      filteredGlyphList: [],
      selectedGlyphId: null,
      selectedLayerId: 'default',
      selectedNodeIds: [],
      viewport: {
        zoom: 0.46,
        pan: { x: 0, y: 30 },
      },

      setSearchQuery: (query) =>
        set((state) => {
          state.currentSearchQuery = query
          syncFilteredGlyphList(state)
        }),

      setSelectedGlyphId: (id) =>
        set((state) => {
          state.selectedGlyphId = id
          state.selectedNodeIds = []
        }),

      setSelectedNodeIds: (ids) =>
        set((state) => {
          state.selectedNodeIds = ids
        }),

      updateViewport: (zoom, panX, panY) =>
        set((state) => {
          state.viewport.zoom = Math.min(4, Math.max(0.1, zoom))
          state.viewport.pan = { x: panX, y: panY }
        }),

      updateNodePosition: (glyphId, pathId, nodeId, newPos) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          if (!glyph) {
            return
          }

          const node = findNode(findPath(glyph, pathId), nodeId)
          if (!node) {
            return
          }

          node.x = Math.round(newPos.x)
          node.y = Math.round(newPos.y)
        }),

      updateNodePositions: (glyphId, updates) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          if (!glyph) {
            return
          }

          for (const update of updates) {
            const node = findNode(findPath(glyph, update.pathId), update.nodeId)
            if (!node) {
              continue
            }

            node.x = Math.round(update.newPos.x)
            node.y = Math.round(update.newPos.y)
          }
        }),

      updateNodeType: (glyphId, pathId, nodeId, type) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          if (!glyph) {
            return
          }

          const node = findNode(findPath(glyph, pathId), nodeId)
          if (node) {
            node.type = type
          }
        }),

      updateGlyphMetrics: (glyphId, metrics) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          if (!glyph) {
            return
          }

          glyph.metrics = {
            ...glyph.metrics,
            ...metrics,
          }
        }),

      loadProjectState: (id, title, fontData) =>
        set((state) => {
          state.projectId = id
          state.projectTitle = title
          state.fontData = fontData
          syncFilteredGlyphList(state)

          if (
            state.selectedGlyphId &&
            !fontData.glyphs[state.selectedGlyphId]
          ) {
            state.selectedGlyphId = Object.keys(fontData.glyphs)[0] ?? null
            state.selectedNodeIds = []
          } else if (!state.selectedGlyphId) {
            state.selectedGlyphId = Object.keys(fontData.glyphs)[0] ?? null
          }
        }),

      closeProjectState: () =>
        set((state) => {
          state.fontData = null
          state.projectId = null
          state.projectTitle = ''
          state.filteredGlyphList = []
        }),
    })),
    {
      partialize: (state) => ({ fontData: state.fontData, selectedGlyphId: state.selectedGlyphId, selectedNodeIds: state.selectedNodeIds, viewport: state.viewport }),
      limit: 50,
    }
  )
)

export const useTemporalStore = <T>(
  selector: (state: TemporalState<unknown>) => T
): T =>
  useSyncExternalStore(
    useStore.temporal.subscribe,
    () => selector(useStore.temporal.getState()),
    () => selector(useStore.temporal.getState())
  )
