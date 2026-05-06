import type { PathData } from '../../../store'

export type TransformField = 'x' | 'y' | 'width' | 'height'
export type AlignTarget =
  | 'left'
  | 'centerX'
  | 'right'
  | 'top'
  | 'middleY'
  | 'bottom'

export interface SelectionNode {
  pathId: string
  nodeId: string
  x: number
  y: number
}

export interface SelectionBounds {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  width: number
  height: number
}

export interface NodePositionUpdate {
  pathId: string
  nodeId: string
  newPos: { x: number; y: number }
}

const parseSelectionKey = (selectionKey: string) => {
  const [pathId, nodeId] = selectionKey.split(':')
  return pathId && nodeId ? { pathId, nodeId } : null
}

export const getSelectedNodes = (
  paths: PathData[],
  selectedNodeIds: string[]
): SelectionNode[] => {
  const nodes: SelectionNode[] = []

  for (const selectionKey of selectedNodeIds) {
    const parsed = parseSelectionKey(selectionKey)
    if (!parsed) {
      continue
    }

    const path = paths.find((candidate) => candidate.id === parsed.pathId)
    const node = path?.nodes.find((candidate) => candidate.id === parsed.nodeId)
    if (!node) {
      continue
    }

    nodes.push({
      pathId: parsed.pathId,
      nodeId: parsed.nodeId,
      x: node.x,
      y: node.y,
    })
  }

  return nodes
}

export const getSelectionBounds = (
  nodes: SelectionNode[]
): SelectionBounds | null => {
  if (nodes.length === 0) {
    return null
  }

  const xMin = Math.min(...nodes.map((node) => node.x))
  const yMin = Math.min(...nodes.map((node) => node.y))
  const xMax = Math.max(...nodes.map((node) => node.x))
  const yMax = Math.max(...nodes.map((node) => node.y))

  return {
    xMin,
    yMin,
    xMax,
    yMax,
    width: xMax - xMin,
    height: yMax - yMin,
  }
}

export const formatTransformNumber = (value: number | undefined) =>
  Number.isFinite(value) ? String(Math.round(value ?? 0)) : '0'

export const parseTransformNumber = (value: string) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const buildTranslatedUpdates = (
  nodes: SelectionNode[],
  deltaX: number,
  deltaY: number
): NodePositionUpdate[] =>
  nodes.map((node) => ({
    pathId: node.pathId,
    nodeId: node.nodeId,
    newPos: {
      x: node.x + deltaX,
      y: node.y + deltaY,
    },
  }))

export const buildScaledUpdates = (
  nodes: SelectionNode[],
  bounds: SelectionBounds,
  scaleX: number,
  scaleY: number
): NodePositionUpdate[] => {
  const originX = bounds.xMin + bounds.width / 2
  const originY = bounds.yMin + bounds.height / 2

  return nodes.map((node) => ({
    pathId: node.pathId,
    nodeId: node.nodeId,
    newPos: {
      x: originX + (node.x - originX) * scaleX,
      y: originY + (node.y - originY) * scaleY,
    },
  }))
}

export const buildMirrorUpdates = (
  nodes: SelectionNode[],
  bounds: SelectionBounds,
  axis: 'x' | 'y'
): NodePositionUpdate[] =>
  nodes.map((node) => ({
    pathId: node.pathId,
    nodeId: node.nodeId,
    newPos: {
      x: axis === 'x' ? bounds.xMin + bounds.xMax - node.x : node.x,
      y: axis === 'y' ? bounds.yMin + bounds.yMax - node.y : node.y,
    },
  }))

export const buildAlignUpdates = (
  nodes: SelectionNode[],
  bounds: SelectionBounds,
  target: AlignTarget
): NodePositionUpdate[] => {
  const centerX = bounds.xMin + bounds.width / 2
  const middleY = bounds.yMin + bounds.height / 2

  return nodes.map((node) => {
    let x = node.x
    let y = node.y

    if (target === 'left') x = bounds.xMin
    if (target === 'centerX') x = centerX
    if (target === 'right') x = bounds.xMax
    if (target === 'top') y = bounds.yMax
    if (target === 'middleY') y = middleY
    if (target === 'bottom') y = bounds.yMin

    return {
      pathId: node.pathId,
      nodeId: node.nodeId,
      newPos: { x, y },
    }
  })
}

export const buildFieldCommitUpdates = (
  field: TransformField,
  value: string,
  nodes: SelectionNode[],
  bounds: SelectionBounds
): NodePositionUpdate[] => {
  const nextValue = parseTransformNumber(value)

  if (field === 'x') {
    return buildTranslatedUpdates(nodes, nextValue - bounds.xMin, 0)
  }

  if (field === 'y') {
    return buildTranslatedUpdates(nodes, 0, nextValue - bounds.yMin)
  }

  if (field === 'width' && bounds.width !== 0 && nextValue > 0) {
    return buildScaledUpdates(nodes, bounds, nextValue / bounds.width, 1)
  }

  if (field === 'height' && bounds.height !== 0 && nextValue > 0) {
    return buildScaledUpdates(nodes, bounds, 1, nextValue / bounds.height)
  }

  return []
}
