import type { GlyphData, PathData, PathNode } from './types'
import { generateId } from './glyphGeometry'

export type ReconnectEndpoint = {
  pathId: string
  nodeId: string
  node: PathNode
  endpoint: 'start' | 'end'
}

export const pairNearestEndpoints = (
  endpoints: ReconnectEndpoint[]
): Array<[ReconnectEndpoint, ReconnectEndpoint]> => {
  const remaining = [...endpoints]
  const pairs: Array<[ReconnectEndpoint, ReconnectEndpoint]> = []

  while (remaining.length >= 2) {
    let bestPair: [number, number] | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (
      let sourceIndex = 0;
      sourceIndex < remaining.length;
      sourceIndex += 1
    ) {
      for (
        let targetIndex = sourceIndex + 1;
        targetIndex < remaining.length;
        targetIndex += 1
      ) {
        const source = remaining[sourceIndex]
        const target = remaining[targetIndex]
        if (
          source.pathId === target.pathId &&
          source.endpoint === target.endpoint
        ) {
          continue
        }

        const distance = Math.hypot(
          source.node.x - target.node.x,
          source.node.y - target.node.y
        )
        if (distance < bestDistance) {
          bestDistance = distance
          bestPair = [sourceIndex, targetIndex]
        }
      }
    }

    if (!bestPair) {
      break
    }

    const [sourceIndex, targetIndex] = bestPair
    const target = remaining.splice(targetIndex, 1)[0]
    const source = remaining.splice(sourceIndex, 1)[0]
    pairs.push([source, target])
  }

  return pairs
}

export const createReconnectedClosedPath = (
  sourcePathId: string,
  nodes: PathNode[]
): PathData => ({
  id: `${sourcePathId}_${generateId('reconnect')}`,
  closed: true,
  nodes: nodes.map((node) => ({ ...node })),
})

/**
 * When exactly 4 nodes on a closed path are selected, split the path into
 * two new closed paths using the selected nodes as split points.
 * Returns the new selection keys, or an empty array if no reconnect occurred.
 */
export const reconnectFourClosedNodes = (
  glyph: GlyphData,
  selectedNodeIds: string[]
): string[] => {
  const selectedByPath = new Map<string, Set<string>>()
  for (const selectionKey of selectedNodeIds) {
    const [pathId, nodeId] = selectionKey.split(':')
    if (!pathId || !nodeId) {
      continue
    }
    const nodeIds = selectedByPath.get(pathId) ?? new Set<string>()
    nodeIds.add(nodeId)
    selectedByPath.set(pathId, nodeIds)
  }

  const nextSelection: string[] = []
  let didReconnect = false

  glyph.paths = glyph.paths.flatMap((path) => {
    const selectedIds = selectedByPath.get(path.id)
    if (!path.closed || selectedIds?.size !== 4) {
      return [path]
    }

    const selectedIndices = path.nodes
      .map((node, index) => (selectedIds.has(node.id) ? index : -1))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)
    if (selectedIndices.length !== 4) {
      return [path]
    }

    const chains = selectedIndices.map((start, index) => {
      const end = selectedIndices[(index + 1) % selectedIndices.length]
      return start < end
        ? path.nodes.slice(start, end + 1)
        : [...path.nodes.slice(start), ...path.nodes.slice(0, end + 1)]
    })

    const firstPiece = createReconnectedClosedPath(path.id, [
      ...chains[0],
      ...chains[2],
    ])
    const secondPiece = createReconnectedClosedPath(path.id, [
      ...chains[1],
      ...chains[3],
    ])

    for (const piece of [firstPiece, secondPiece]) {
      for (const node of piece.nodes) {
        if (selectedIds.has(node.id)) {
          nextSelection.push(`${piece.id}:${node.id}`)
        }
      }
    }

    didReconnect = true
    return [firstPiece, secondPiece]
  })

  return didReconnect ? Array.from(new Set(nextSelection)) : []
}
