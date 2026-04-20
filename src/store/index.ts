import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal, type TemporalState } from 'zundo'
import {
  clearProjectArchive,
  getArchivedGlyphLayer,
  getHotGlyphLayerSnapshot,
  getGlyphLayerSnapshot,
  getProjectArchiveFirstMasterId,
  ingestProjectData,
} from '../lib/projectArchive'
import type { ProjectSourceFormat } from '../lib/projectFormats'

export type NodeType = 'corner' | 'smooth' | 'offcurve' | 'qcurve'

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

export const isPathEndpointNode = (path: PathData, nodeId: string) => {
  if (path.closed || path.nodes.length === 0) {
    return false
  }

  return path.nodes[0]?.id === nodeId || path.nodes[path.nodes.length - 1]?.id === nodeId
}

export const getEffectiveNodeType = (
  path: PathData | undefined,
  node: PathNode | undefined
): NodeType | undefined => {
  if (!path || !node) {
    return node?.type
  }

  if (node.type === 'smooth' && isPathEndpointNode(path, node.id)) {
    return 'corner'
  }

  return node.type
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

export interface GlyphAnchor {
  id: string
  name: string
  x: number
  y: number
}

export interface GlyphGuideline {
  id: string
  x: number
  y: number
  angle: number
  locked?: boolean
  name?: string
}

export interface GlyphMetrics {
  lsb: number
  rsb: number
  width: number
}

export interface GlyphLayerData {
  id: string
  name: string
  associatedMasterId?: string | null
  paths: PathData[]
  components: string[]
  componentRefs: GlyphComponentRef[]
  anchors: GlyphAnchor[]
  guidelines: GlyphGuideline[]
  metrics: GlyphMetrics
}

export interface GlyphData {
  id: string
  name: string
  activeLayerId?: string | null
  paths: PathData[]
  components: string[]
  componentRefs: GlyphComponentRef[]
  anchors?: GlyphAnchor[]
  guidelines?: GlyphGuideline[]
  metrics: GlyphMetrics
  layers?: Record<string, GlyphLayerData>
  layerOrder?: string[]
  unicode?: string | null
  export?: boolean
  category?: string | null
  subCategory?: string | null
  production?: string | null
}

export interface FontData {
  glyphs: Record<string, GlyphData>
  lineMetricsHorizontalLayout?: Record<
    string,
    {
      value: number
      zone?: number
    }
  >
}

export interface SelectedNodeRef {
  pathId: string
  nodeId: string
}

export interface SelectedSegmentState {
  pathId: string
  startNodeId: string
  endNodeId: string
  type: 'line' | 'quad' | 'cubic' | 'quadBlob'
}

export interface ViewportState {
  zoom: number
  pan: { x: number; y: number }
}

export type WorkspaceView = 'overview' | 'editor'
export type OverviewGroupByState = 'none' | 'script' | 'block'

export interface GlobalState {
  fontData: FontData | null
  projectId: string | null
  projectTitle: string
  isDirty: boolean
  dirtyGlyphIds: string[]
  previewGlyphMetrics: { glyphId: string; metrics: GlyphMetrics } | null
  idsDictionary: Record<string, string[]>
  currentSearchQuery: string
  filteredGlyphList: GlyphData[]
  selectedGlyphId: string | null
  selectedLayerId: string | null
  selectedNodeIds: string[]
  selectedSegment: SelectedSegmentState | null
  workspaceView: WorkspaceView
  overviewGroupBy: OverviewGroupByState
  overviewSectionId: string
  overviewGridState: unknown | null
  overviewTopGlyphId: string | null
  viewport: ViewportState

  setSearchQuery: (query: string) => void
  setSelectedGlyphId: (id: string | null) => void
  setWorkspaceView: (view: WorkspaceView) => void
  setOverviewGrouping: (groupBy: OverviewGroupByState) => void
  setOverviewSectionId: (sectionId: string) => void
  setOverviewGridState: (state: unknown | null) => void
  setOverviewTopGlyphId: (glyphId: string | null) => void
  setSelectedNodeIds: (ids: string[]) => void
  setSelectedSegment: (segment: SelectedSegmentState | null) => void
  setSelectedLayerId: (id: string | null) => void
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
  createPath: (glyphId: string, path: PathData) => void
  appendNodesToPath: (
    glyphId: string,
    pathId: string,
    nodes: PathNode[],
    prepend?: boolean
  ) => void
  replacePathNodes: (
    glyphId: string,
    pathId: string,
    startNodeId: string,
    endNodeId: string,
    nodes: PathNode[]
  ) => void
  closePath: (glyphId: string, pathId: string) => void
  connectOpenPaths: (
    glyphId: string,
    sourcePathId: string,
    sourceNodeId: string,
    targetPathId: string,
    targetNodeId: string
  ) => { pathId: string; nodeIds: string[] } | null
  convertLineSegmentToCurve: (
    glyphId: string,
    pathId: string,
    startNodeId: string,
    endNodeId: string
  ) => void
  deleteSelectedNodes: (glyphId: string, selectedNodeIds: string[]) => void
  loadProjectState: (
    id: string,
    title: string,
    fontData: FontData,
    projectMetadata?: Record<string, unknown> | null,
    projectSourceFormat?: ProjectSourceFormat | null
  ) => void
  closeProjectState: () => void
  markProjectSaved: () => void
  setPreviewGlyphMetrics: (glyphId: string, metrics: GlyphMetrics) => void
  clearPreviewGlyphMetrics: (glyphId?: string) => void
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

const markGlyphDirty = (state: GlobalState, glyphId: string) => {
  state.isDirty = true
  if (!state.dirtyGlyphIds.includes(glyphId)) {
    state.dirtyGlyphIds.push(glyphId)
  }
}

const recomputeGlyphSidebearings = (glyph: GlyphData | undefined) => {
  if (!glyph) {
    return
  }

  const allNodes = glyph.paths.flatMap((path) => path.nodes)
  if (allNodes.length === 0) {
    return
  }

  const xMin = Math.min(...allNodes.map((node) => node.x))
  const xMax = Math.max(...allNodes.map((node) => node.x))

  glyph.metrics.lsb = Math.round(xMin)
  glyph.metrics.rsb = Math.round(glyph.metrics.width - xMax)
}

const findPath = (glyph: GlyphData, pathId: string) =>
  glyph.paths.find((path) => path.id === pathId)

export const getGlyphLayer = (glyph: GlyphData | undefined, layerId: string | null | undefined) => {
  if (!glyph) {
    return null
  }

  const requestedLayerId = layerId ?? glyph.activeLayerId ?? null
  if (glyph.activeLayerId && glyph.activeLayerId === requestedLayerId) {
    return getHotGlyphLayerSnapshot(glyph, glyph.activeLayerId)
  }

  const archivedLayer = getArchivedGlyphLayer(glyph.id, requestedLayerId)
  if (archivedLayer) {
    return archivedLayer
  }

  return getGlyphLayerSnapshot(glyph, requestedLayerId)
}

const syncGlyphTopLevelFromLayer = (
  glyph: GlyphData | undefined,
  layerId: string | null | undefined
) => {
  const layer = getGlyphLayer(glyph, layerId)
  if (!glyph || !layer) {
    return
  }

  glyph.paths = layer.paths
  glyph.components = layer.components
  glyph.componentRefs = layer.componentRefs
  glyph.anchors = layer.anchors
  glyph.guidelines = layer.guidelines
  glyph.metrics = layer.metrics
  glyph.activeLayerId = layer.id
}

const findNode = (path: PathData | undefined, nodeId: string) =>
  path?.nodes.find((node) => node.id === nodeId)

const generateId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`

const lerp = (start: number, end: number, t: number) => start + (end - start) * t

const orientOpenPathNodesForConnection = (
  path: PathData,
  endpointNodeId: string,
  placeEndpointAt: 'start' | 'end'
) => {
  const nodes = [...path.nodes]
  if (nodes.length === 0) {
    return nodes
  }

  const isStart = nodes[0]?.id === endpointNodeId
  const isEnd = nodes[nodes.length - 1]?.id === endpointNodeId
  if (!isStart && !isEnd) {
    return nodes
  }

  if ((placeEndpointAt === 'end' && isEnd) || (placeEndpointAt === 'start' && isStart)) {
    return nodes
  }

  return [...nodes].reverse()
}

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
      isDirty: false,
      dirtyGlyphIds: [],
      previewGlyphMetrics: null,
      idsDictionary: IDS_DICTIONARY,
      currentSearchQuery: '',
      filteredGlyphList: [],
      selectedGlyphId: null,
      selectedLayerId: 'default',
      selectedNodeIds: [],
      selectedSegment: null,
      workspaceView: 'overview',
      overviewGroupBy: 'script',
      overviewSectionId: 'all',
      overviewGridState: null,
      overviewTopGlyphId: null,
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
          state.selectedSegment = null
          if (id) {
            syncGlyphTopLevelFromLayer(state.fontData?.glyphs[id], state.selectedLayerId)
          }
        }),

      setWorkspaceView: (view) =>
        set((state) => {
          state.workspaceView = view
          state.selectedNodeIds = []
          state.selectedSegment = null
        }),

      setOverviewGrouping: (groupBy) =>
        set((state) => {
          state.overviewGroupBy = groupBy
        }),

      setOverviewSectionId: (sectionId) =>
        set((state) => {
          state.overviewSectionId = sectionId
        }),

      setOverviewGridState: (gridState) =>
        set((state) => {
          state.overviewGridState = gridState
        }),

      setOverviewTopGlyphId: (glyphId) =>
        set((state) => {
          state.overviewTopGlyphId = glyphId
        }),

      setSelectedNodeIds: (ids) =>
        set((state) => {
          state.selectedNodeIds = ids
          if (ids.length > 0) {
            state.selectedSegment = null
          }
        }),

      setSelectedSegment: (segment) =>
        set((state) => {
          state.selectedSegment = segment
          if (segment) {
            state.selectedNodeIds = []
          }
        }),

      setSelectedLayerId: (id) =>
        set((state) => {
          state.selectedLayerId = id
          state.selectedNodeIds = []
          state.selectedSegment = null
          if (state.selectedGlyphId) {
            syncGlyphTopLevelFromLayer(
              state.fontData?.glyphs[state.selectedGlyphId],
              state.selectedLayerId
            )
          }
          useStore.temporal.getState().clear()
        }),

      updateViewport: (zoom, panX, panY) =>
        set((state) => {
          state.viewport.zoom = Math.min(800, Math.max(0.1, zoom))
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
          recomputeGlyphSidebearings(glyph)
          markGlyphDirty(state, glyphId)
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
          recomputeGlyphSidebearings(glyph)
          markGlyphDirty(state, glyphId)
        }),

      updateNodeType: (glyphId, pathId, nodeId, type) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          if (!glyph) {
            return
          }

          const path = findPath(glyph, pathId)
          const node = findNode(path, nodeId)
          if (node) {
            if (node.type === 'offcurve' || node.type === 'qcurve') {
              return
            }

            if (type === 'smooth' && path && isPathEndpointNode(path, nodeId)) {
              node.type = 'corner'
              return
            }

            node.type = type
            markGlyphDirty(state, glyphId)
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
          markGlyphDirty(state, glyphId)
        }),

      createPath: (glyphId, path) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          if (!glyph) {
            return
          }

          glyph.paths.push({
            ...path,
            id: path.id || generateId('path'),
            nodes: path.nodes.map((node) => ({
              ...node,
              id: node.id || generateId('node'),
            })),
          })
          markGlyphDirty(state, glyphId)
        }),

      appendNodesToPath: (glyphId, pathId, nodes, prepend = false) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          const path = glyph ? findPath(glyph, pathId) : undefined
          if (!path) {
            return
          }

          const normalizedNodes = nodes.map((node) => ({
            ...node,
            id: node.id || generateId('node'),
          }))

          path.nodes = prepend
            ? [...normalizedNodes, ...path.nodes]
            : [...path.nodes, ...normalizedNodes]
          markGlyphDirty(state, glyphId)
        }),

      replacePathNodes: (glyphId, pathId, startNodeId, endNodeId, nodes) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          const path = glyph ? findPath(glyph, pathId) : undefined
          if (!path) {
            return
          }

          const startIndex = path.nodes.findIndex((node) => node.id === startNodeId)
          const endIndex = path.nodes.findIndex((node) => node.id === endNodeId)
          if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
            return
          }

          const normalizedNodes = nodes.map((node) => ({
            ...node,
            id: node.id || generateId('node'),
          }))

          path.nodes = [
            ...path.nodes.slice(0, startIndex),
            ...normalizedNodes,
            ...path.nodes.slice(endIndex + 1),
          ]
          markGlyphDirty(state, glyphId)
        }),

      closePath: (glyphId, pathId) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          const path = glyph ? findPath(glyph, pathId) : undefined
          if (!path || path.closed || path.nodes.length < 2) {
            return
          }

          path.closed = true
          markGlyphDirty(state, glyphId)
        }),

      connectOpenPaths: (glyphId, sourcePathId, sourceNodeId, targetPathId, targetNodeId) => {
        let result: { pathId: string; nodeIds: string[] } | null = null

        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          const sourcePath = glyph ? findPath(glyph, sourcePathId) : undefined
          const targetPath = glyph ? findPath(glyph, targetPathId) : undefined
          if (
            !glyph ||
            !sourcePath ||
            !targetPath ||
            sourcePath.closed ||
            targetPath.closed ||
            !isPathEndpointNode(sourcePath, sourceNodeId) ||
            !isPathEndpointNode(targetPath, targetNodeId)
          ) {
            return
          }

          if (sourcePathId === targetPathId) {
            if (sourceNodeId === targetNodeId) {
              return
            }
            sourcePath.closed = true
            result = { pathId: sourcePathId, nodeIds: sourcePath.nodes.map((node) => node.id) }
            markGlyphDirty(state, glyphId)
            return
          }

          const sourceNodes = orientOpenPathNodesForConnection(
            sourcePath,
            sourceNodeId,
            'end'
          )
          const targetNodes = orientOpenPathNodesForConnection(
            targetPath,
            targetNodeId,
            'start'
          )

          sourcePath.nodes = [...sourceNodes, ...targetNodes]
          sourcePath.closed = false
          glyph.paths = glyph.paths.filter((path) => path.id !== targetPathId)

          result = {
            pathId: sourcePathId,
            nodeIds: sourcePath.nodes.map((node) => node.id),
          }
          markGlyphDirty(state, glyphId)
        })

        return result
      },

      convertLineSegmentToCurve: (glyphId, pathId, startNodeId, endNodeId) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          const path = glyph ? findPath(glyph, pathId) : undefined
          if (!glyph || !path) {
            return
          }

          const startIndex = path.nodes.findIndex((node) => node.id === startNodeId)
          const endIndex = path.nodes.findIndex((node) => node.id === endNodeId)
          if (startIndex < 0 || endIndex !== startIndex + 1) {
            return
          }

          const startNode = path.nodes[startIndex]
          const endNode = path.nodes[endIndex]
          if (
            startNode.type === 'offcurve' ||
            startNode.type === 'qcurve' ||
            endNode.type === 'offcurve' ||
            endNode.type === 'qcurve'
          ) {
            return
          }

          const handle1: PathNode = {
            id: generateId('node'),
            x: Math.round(lerp(startNode.x, endNode.x, 1 / 3)),
            y: Math.round(lerp(startNode.y, endNode.y, 1 / 3)),
            type: 'offcurve',
          }
          const handle2: PathNode = {
            id: generateId('node'),
            x: Math.round(lerp(startNode.x, endNode.x, 2 / 3)),
            y: Math.round(lerp(startNode.y, endNode.y, 2 / 3)),
            type: 'offcurve',
          }

          path.nodes = [
            ...path.nodes.slice(0, startIndex),
            { ...startNode, type: 'smooth' },
            handle1,
            handle2,
            { ...endNode, type: 'smooth' },
            ...path.nodes.slice(endIndex + 1),
          ]
          state.selectedSegment = null
          markGlyphDirty(state, glyphId)
        }),

      deleteSelectedNodes: (glyphId, selectedNodeIds) =>
        set((state) => {
          const glyph = state.fontData?.glyphs[glyphId]
          if (!glyph || selectedNodeIds.length === 0) {
            return
          }

          const selectedByPath = new Map<string, Set<string>>()
          for (const selectedNodeId of selectedNodeIds) {
            const [pathId, nodeId] = selectedNodeId.split(':')
            if (!pathId || !nodeId) {
              continue
            }
            const ids = selectedByPath.get(pathId) ?? new Set<string>()
            ids.add(nodeId)
            selectedByPath.set(pathId, ids)
          }

          glyph.paths = glyph.paths
            .map((path) => {
              const nodeIds = selectedByPath.get(path.id)
              if (!nodeIds) {
                return path
              }
              return {
                ...path,
                nodes: path.nodes.filter((node) => !nodeIds.has(node.id)),
              }
            })
            .filter((path) => path.nodes.length > 0)

          state.selectedNodeIds = []
          state.selectedSegment = null
          markGlyphDirty(state, glyphId)
        }),

      loadProjectState: (id, title, fontData, projectMetadata = null, projectSourceFormat = null) =>
        set((state) => {
          const hotFontData = ingestProjectData(
            fontData,
            projectMetadata,
            projectSourceFormat
          )
          state.projectId = id
          state.projectTitle = title
          state.fontData = hotFontData
          state.isDirty = false
          state.dirtyGlyphIds = []
          state.workspaceView = 'overview'
          state.overviewGroupBy = 'script'
          state.overviewSectionId = 'all'
          state.overviewGridState = null
          state.overviewTopGlyphId = null
          const firstGlyph = Object.values(hotFontData.glyphs)[0]
          const firstMasterId = getProjectArchiveFirstMasterId()
          state.selectedLayerId =
            (firstMasterId && firstGlyph && getArchivedGlyphLayer(firstGlyph.id, firstMasterId)
              ? firstMasterId
              : null) ||
            (firstGlyph ? getArchivedGlyphLayer(firstGlyph.id, null)?.id ?? null : null) ||
            null
          syncFilteredGlyphList(state)

          if (
            state.selectedGlyphId &&
            !hotFontData.glyphs[state.selectedGlyphId]
          ) {
            state.selectedGlyphId = Object.keys(hotFontData.glyphs)[0] ?? null
            state.selectedNodeIds = []
            state.selectedSegment = null
          } else if (!state.selectedGlyphId) {
            state.selectedGlyphId = Object.keys(hotFontData.glyphs)[0] ?? null
          }
          if (state.selectedGlyphId) {
            syncGlyphTopLevelFromLayer(
              state.fontData?.glyphs[state.selectedGlyphId],
              state.selectedLayerId
            )
          }
        }),

      closeProjectState: () =>
        set((state) => {
          state.fontData = null
          state.projectId = null
          state.projectTitle = ''
          state.isDirty = false
          state.dirtyGlyphIds = []
          state.previewGlyphMetrics = null
          state.filteredGlyphList = []
          state.selectedNodeIds = []
          state.selectedSegment = null
          state.selectedLayerId = null
          state.workspaceView = 'overview'
          state.overviewGroupBy = 'script'
          state.overviewSectionId = 'all'
          state.overviewGridState = null
          state.overviewTopGlyphId = null
          clearProjectArchive()
          useStore.temporal.getState().clear()
        }),

      markProjectSaved: () =>
        set((state) => {
          state.isDirty = false
        }),

      setPreviewGlyphMetrics: (glyphId, metrics) =>
        set((state) => {
          state.previewGlyphMetrics = { glyphId, metrics }
        }),

      clearPreviewGlyphMetrics: (glyphId) =>
        set((state) => {
          if (!glyphId || state.previewGlyphMetrics?.glyphId === glyphId) {
            state.previewGlyphMetrics = null
          }
        }),
    })),
    {
      partialize: (state) => ({ fontData: state.fontData }),
      equality: (pastState, currentState) =>
        pastState.fontData === currentState.fontData,
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
