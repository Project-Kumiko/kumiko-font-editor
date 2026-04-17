import { BaseTool, type EventStream, type ToolEvent } from './BaseTool'
import type { PathHitInfo } from '../canvas/SceneView'
import { useStore, type NodeType, type PathData, type PathNode } from '../store'

type AppendTarget =
  | { mode: 'append' | 'prepend'; pathId: string; anchorNodeId: string }
  | null

export class PenTool extends BaseTool {
  identifier = 'pen'

  override activate(): void {
    this.setCursor('crosshair')
    this.canvasController.requestUpdate()
  }

  override deactivate(): void {
    super.deactivate()
    this.canvasController.requestUpdate()
  }

  handleHover(_event: ToolEvent): void {
    this.setCursor('crosshair')
    this.canvasController.requestUpdate()
  }

  async handleDrag(eventStream: EventStream, initialEvent: ToolEvent): Promise<void> {
    initialEvent.preventDefault()

    if (!this.sceneModel.canEdit || !this.sceneModel.glyph?.glyphId) {
      eventStream.done()
      return
    }

    const glyphId = this.sceneModel.glyph.glyphId
    const downPoint = this.localPoint(initialEvent)
    const hit = this.sceneController.hitTestAtPoint(
      downPoint,
      this.sceneController.mouseClickMargin,
      this.sceneController.selection
    )
    const appendTarget = this.getAppendTarget(glyphId)

    let endPoint = downPoint
    let didDrag = false

    for await (const event of asyncEventIterator(eventStream)) {
      event.preventDefault()
      endPoint = this.localPoint(event)
      if (!didDrag && BaseTool.shouldInitiateDrag(downPoint, endPoint)) {
        didDrag = true
      }
    }

    const store = useStore.getState()

    if (!didDrag && (hit.type === 'point' || hit.type === 'handle')) {
      const pointRef = this.sceneModel.glyph?.pointRefs?.[hit.pointIndex]
      if (pointRef) {
        store.setSelectedNodeIds([`${pointRef.pathId}:${pointRef.nodeId}`])
        this.sceneController.setSelection(new Set([`point/${hit.pointIndex}`]))
        this.canvasController.requestUpdate()
        return
      }
    }

    if (!appendTarget && (hit.type === 'line-segment' || hit.type === 'curve-segment')) {
      if (initialEvent.altKey && hit.type === 'line-segment') {
        const insertedNodeIds = this.insertHandlesOnLineSegment(glyphId, hit.pathHit)
        if (insertedNodeIds) {
          store.setSelectedNodeIds(
            insertedNodeIds.nodeIds.map((nodeId) => `${insertedNodeIds.pathId}:${nodeId}`)
          )
        }
        this.canvasController.requestUpdate()
        return
      }

      const insertedPoint = this.insertPointOnSegment(glyphId, hit.pathHit)
      if (insertedPoint) {
        store.setSelectedNodeIds([`${insertedPoint.pathId}:${insertedPoint.nodeId}`])
      }
      this.canvasController.requestUpdate()
      return
    }

    if (!didDrag && appendTarget) {
      const endpointHit =
        hit.type === 'point' || hit.type === 'handle'
          ? this.getEndpointHit(hit.pointIndex)
          : null
      if (
        hit.type === 'point' &&
        endpointHit &&
        endpointHit.pathId === appendTarget.pathId &&
        endpointHit.nodeId !== appendTarget.anchorNodeId
      ) {
        store.closePath(glyphId, appendTarget.pathId)
        store.setSelectedNodeIds([`${appendTarget.pathId}:${appendTarget.anchorNodeId}`])
        this.canvasController.requestUpdate()
        return
      }

      if (
        hit.type === 'point' &&
        endpointHit &&
        endpointHit.pathId !== appendTarget.pathId
      ) {
        const result = store.connectOpenPaths(
          glyphId,
          appendTarget.pathId,
          appendTarget.anchorNodeId,
          endpointHit.pathId,
          endpointHit.nodeId
        )
        if (result) {
          store.setSelectedNodeIds(
            [`${result.pathId}:${appendTarget.anchorNodeId}`, `${result.pathId}:${endpointHit.nodeId}`]
          )
          this.canvasController.requestUpdate()
          return
        }
      }
    }

    if (!appendTarget) {
      if (!didDrag) {
        const node = this.createNode(endPoint.x, endPoint.y, 'corner')
        const pathId = this.generateId('path')
        const path: PathData = {
          id: pathId,
          closed: false,
          nodes: [node],
        }
        store.createPath(glyphId, path)
        store.setSelectedNodeIds([`${pathId}:${node.id}`])
        this.canvasController.requestUpdate()
        return
      }

      const pathId = this.generateId('path')
      const path: PathData = {
        id: pathId,
        closed: false,
        nodes: this.buildSegmentNodes(downPoint, endPoint, downPoint, true),
      }
      store.createPath(glyphId, path)
      store.setSelectedNodeIds([`${pathId}:${path.nodes.at(-1)!.id}`])
      this.canvasController.requestUpdate()
      return
    }

    const anchorPoint = this.getAnchorPoint(glyphId, appendTarget)
    if (!anchorPoint) {
      return
    }

    const nodes = this.buildSegmentNodes(anchorPoint, endPoint, downPoint, didDrag)
    const createdNodes = this.normalizeNodes(
      appendTarget.mode === 'prepend' ? [...nodes].reverse().slice(0, -1) : nodes.slice(1)
    )
    store.appendNodesToPath(
      glyphId,
      appendTarget.pathId,
      createdNodes,
      appendTarget.mode === 'prepend'
    )
    store.setSelectedNodeIds([
      `${appendTarget.pathId}:${
        appendTarget.mode === 'prepend' ? createdNodes[0]!.id : createdNodes.at(-1)!.id
      }`,
    ])
    this.canvasController.requestUpdate()
  }

  private getAppendTarget(glyphId: string): AppendTarget {
    const state = useStore.getState()
    const glyph = state.fontData?.glyphs[glyphId]
    const selectedNodeId = state.selectedNodeIds.at(0)

    if (!glyph || !selectedNodeId) {
      return null
    }

    const [pathId, nodeId] = selectedNodeId.split(':')
    const path = glyph.paths.find((candidate) => candidate.id === pathId)
    const node = path?.nodes.find((candidate) => candidate.id === nodeId)
    if (!path || !node || path.closed || node.type === 'offcurve' || node.type === 'qcurve') {
      return null
    }

    if (path.nodes[0]?.id === nodeId) {
      return { mode: 'prepend', pathId, anchorNodeId: nodeId }
    }

    if (path.nodes.at(-1)?.id === nodeId) {
      return { mode: 'append', pathId, anchorNodeId: nodeId }
    }

    return null
  }

  private getEndpointHit(pointIndex?: number) {
    if (pointIndex === undefined) {
      return null
    }

    const pointRef = this.sceneModel.glyph?.pointRefs?.[pointIndex]
    const glyphId = this.sceneModel.glyph?.glyphId
    const glyph = glyphId ? useStore.getState().fontData?.glyphs[glyphId] : undefined
    const path = glyph?.paths.find((candidate) => candidate.id === pointRef?.pathId)
    const node = path?.nodes.find((candidate) => candidate.id === pointRef?.nodeId)

    if (
      !pointRef ||
      !path ||
      !node ||
      path.closed ||
      (path.nodes[0]?.id !== node.id && path.nodes.at(-1)?.id !== node.id) ||
      node.type === 'offcurve' ||
      node.type === 'qcurve'
    ) {
      return null
    }

    return pointRef
  }

  private insertPointOnSegment(glyphId: string, pathHit: PathHitInfo) {
    const segmentNodes = this.getSegmentNodeRefs(pathHit.segment.pointIndices)
    if (!segmentNodes || segmentNodes.length < 2) {
      return null
    }

    const pathId = segmentNodes[0].pathId
    const store = useStore.getState()

    if (pathHit.segment.type === 'line') {
      const inserted = this.createNode(pathHit.x, pathHit.y, 'corner')
      store.replacePathNodes(
        glyphId,
        pathId,
        segmentNodes[0].nodeId,
        segmentNodes[segmentNodes.length - 1].nodeId,
        [segmentNodes[0].node, inserted, segmentNodes[segmentNodes.length - 1].node]
      )
      return { pathId, nodeId: inserted.id }
    }

    const splitNodes = this.splitCurveSegment(pathHit)
    if (!splitNodes) {
      return null
    }

    store.replacePathNodes(
      glyphId,
      pathId,
      segmentNodes[0].nodeId,
      segmentNodes[segmentNodes.length - 1].nodeId,
      splitNodes.nodes
    )
    return { pathId, nodeId: splitNodes.insertedNodeId }
  }

  private insertHandlesOnLineSegment(glyphId: string, pathHit: PathHitInfo) {
    const segmentNodes = this.getSegmentNodeRefs(pathHit.segment.pointIndices)
    if (!segmentNodes || segmentNodes.length !== 2 || pathHit.segment.type !== 'line') {
      return null
    }

    const startNode = segmentNodes[0].node
    const endNode = segmentNodes[1].node
    const pathId = segmentNodes[0].pathId
    const store = useStore.getState()
    const handle1 = this.createNode(
      startNode.x + (endNode.x - startNode.x) / 3,
      startNode.y + (endNode.y - startNode.y) / 3,
      'offcurve'
    )
    const handle2 = this.createNode(
      startNode.x + ((endNode.x - startNode.x) * 2) / 3,
      startNode.y + ((endNode.y - startNode.y) * 2) / 3,
      'offcurve'
    )
    const replacement: PathNode[] = [
      { ...startNode, type: 'smooth' },
      handle1,
      handle2,
      { ...endNode, type: 'smooth' },
    ]
    store.replacePathNodes(glyphId, pathId, startNode.id, endNode.id, replacement)
    return { pathId, nodeIds: [handle1.id, handle2.id] }
  }

  private getSegmentNodeRefs(pointIndices: number[]) {
    const pointRefs = this.sceneModel.glyph?.pointRefs ?? []
    const glyphId = this.sceneModel.glyph?.glyphId
    const glyph = glyphId ? useStore.getState().fontData?.glyphs[glyphId] : undefined
    if (!glyph) {
      return null
    }

    return pointIndices
      .map((pointIndex) => {
        const pointRef = pointRefs[pointIndex]
        const path = glyph.paths.find((candidate) => candidate.id === pointRef?.pathId)
        const node = path?.nodes.find((candidate) => candidate.id === pointRef?.nodeId)
        if (!pointRef || !node) {
          return null
        }
        return { ...pointRef, node }
      })
      .filter((entry): entry is { pathId: string; nodeId: string; node: PathNode } => !!entry)
  }

  private splitCurveSegment(pathHit: PathHitInfo) {
    const segmentNodes = this.getSegmentNodeRefs(pathHit.segment.pointIndices)
    if (!segmentNodes || segmentNodes.length < 3) {
      return null
    }

    const t = this.estimateSegmentT(pathHit.segment.points, { x: pathHit.x, y: pathHit.y })
    const startNode = segmentNodes[0].node
    const endNode = segmentNodes[segmentNodes.length - 1].node

    if (pathHit.segment.type === 'quad' && segmentNodes.length === 3) {
      const handleNode = segmentNodes[1].node
      const q0 = lerpPoint(startNode, handleNode, t)
      const q1 = lerpPoint(handleNode, endNode, t)
      const anchor = lerpPoint(q0, q1, t)
      const inserted = this.createNode(anchor.x, anchor.y, 'smooth')
      const nodes: PathNode[] = [
        { ...startNode, type: 'smooth' },
        this.createNode(q0.x, q0.y, 'qcurve'),
        inserted,
        this.createNode(q1.x, q1.y, 'qcurve'),
        { ...endNode, type: 'smooth' },
      ]
      return {
        insertedNodeId: inserted.id,
        nodes,
      }
    }

    if (pathHit.segment.type === 'cubic' && segmentNodes.length === 4) {
      const handle1 = segmentNodes[1].node
      const handle2 = segmentNodes[2].node
      const q0 = lerpPoint(startNode, handle1, t)
      const q1 = lerpPoint(handle1, handle2, t)
      const q2 = lerpPoint(handle2, endNode, t)
      const r0 = lerpPoint(q0, q1, t)
      const r1 = lerpPoint(q1, q2, t)
      const anchor = lerpPoint(r0, r1, t)
      const inserted = this.createNode(anchor.x, anchor.y, 'smooth')
      const nodes: PathNode[] = [
        { ...startNode, type: 'smooth' },
        this.createNode(q0.x, q0.y, 'offcurve'),
        this.createNode(r0.x, r0.y, 'offcurve'),
        inserted,
        this.createNode(r1.x, r1.y, 'offcurve'),
        this.createNode(q2.x, q2.y, 'offcurve'),
        { ...endNode, type: 'smooth' },
      ]
      return {
        insertedNodeId: inserted.id,
        nodes,
      }
    }

    return null
  }

  private estimateSegmentT(points: Array<{ x: number; y: number }>, target: { x: number; y: number }) {
    const steps = points.length === 3 ? 48 : 64
    let bestT = 0.5
    let bestDistance = Number.POSITIVE_INFINITY

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps
      const sample =
        points.length === 3
          ? quadraticAt(points[0], points[1], points[2], t)
          : cubicAt(points[0], points[1], points[2], points[3], t)
      const sampleDistance = Math.hypot(sample.x - target.x, sample.y - target.y)
      if (sampleDistance < bestDistance) {
        bestDistance = sampleDistance
        bestT = t
      }
    }

    return bestT
  }

  private buildSegmentNodes(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    dragOrigin: { x: number; y: number },
    didDrag: boolean
  ): PathNode[] {
    if (!didDrag) {
      return [
        this.createNode(startPoint.x, startPoint.y, 'corner'),
        this.createNode(endPoint.x, endPoint.y, 'corner'),
      ]
    }

    const handleVector = {
      x: endPoint.x - dragOrigin.x,
      y: endPoint.y - dragOrigin.y,
    }

    const fallbackHandle1 = lerpPoint(startPoint, endPoint, 1 / 3)
    const fallbackHandle2 = lerpPoint(startPoint, endPoint, 2 / 3)
    const handle2 =
      handleVector.x === 0 && handleVector.y === 0
        ? fallbackHandle2
        : {
            x: endPoint.x - handleVector.x,
            y: endPoint.y - handleVector.y,
          }
    const handle1 = {
      x: startPoint.x + (handle2.x - startPoint.x) * 0.5,
      y: startPoint.y + (handle2.y - startPoint.y) * 0.5,
    }

    return [
      this.createNode(startPoint.x, startPoint.y, 'smooth'),
      this.createNode(
        Number.isFinite(handle1.x) ? handle1.x : fallbackHandle1.x,
        Number.isFinite(handle1.y) ? handle1.y : fallbackHandle1.y,
        'offcurve'
      ),
      this.createNode(
        Number.isFinite(handle2.x) ? handle2.x : fallbackHandle2.x,
        Number.isFinite(handle2.y) ? handle2.y : fallbackHandle2.y,
        'offcurve'
      ),
      this.createNode(endPoint.x, endPoint.y, 'smooth'),
    ]
  }

  private normalizeNodes(nodes: PathNode[]) {
    return nodes.map((node) => ({
      ...node,
      id: this.generateId('node'),
    }))
  }

  private createNode(x: number, y: number, type: NodeType): PathNode {
    return {
      id: this.generateId('node'),
      x: Math.round(x),
      y: Math.round(y),
      type,
    }
  }

  private generateId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
  }

  private getAnchorPoint(glyphId: string, target: AppendTarget) {
    if (!target) {
      return undefined
    }

    const glyph = useStore.getState().fontData?.glyphs[glyphId]
    const path = glyph?.paths.find((candidate) => candidate.id === target.pathId)
    const node = path?.nodes.find((candidate) => candidate.id === target.anchorNodeId)
    if (!node) {
      return undefined
    }

    return { x: node.x, y: node.y }
  }
}

function lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

async function* asyncEventIterator(
  eventStream: EventStream
): AsyncGenerator<ToolEvent, void, unknown> {
  while (true) {
    const event = await eventStream.next()
    if (event === undefined) {
      break
    }
    yield event
  }
}

function quadraticAt(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
) {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

function cubicAt(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const mt = 1 - t
  return {
    x:
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x,
    y:
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y,
  }
}
