// 指標工具 - 節點、線段與框選互動

import { BaseTool, type EventStream, type ToolEvent } from './BaseTool'
import type { Point, PathHitInfo } from '../canvas/SceneView'
import type { HitTestResult } from './SceneController'

type DragMode =
  | 'pending'
  | 'point-drag'
  | 'line-segment-drag'
  | 'curve-segment-drag'
  | 'curve-segment-deform'
  | 'rect-select'

export class PointerTool extends BaseTool {
  identifier = 'pointer-tool'

  private dragState: {
    mode: DragMode
    anchorPoint: { x: number; y: number }
    currentPoint: { x: number; y: number }
    pendingHit: HitTestResult
    additiveSelection: boolean
    initialSelection: Set<string>
    initialSelectedPathHit?: PathHitInfo
    selectionToRestore: Set<string>
    activePointIndices: number[]
    pathSnapshot: Map<number, Point>
    didMove: boolean
    pointToggleOnClick?: { selectionKey: string; remove: boolean }
  } = this.createInitialDragState()

  handleHover(event: ToolEvent): void {
    const hit = this.sceneController.hitTestAtPoint(
      this.localPoint(event),
      this.sceneController.mouseClickMargin,
      this.sceneController.selection
    )

    if (hit.type === 'point' || hit.type === 'handle') {
      this.sceneController.setHoverSelection(hit.selection)
      this.sceneController.setHoverPathHit(undefined)
      this.setCursor('pointer')
    } else if (hit.type === 'line-segment' || hit.type === 'curve-segment') {
      this.sceneController.setHoverSelection(new Set())
      this.sceneController.setHoverPathHit(hit.pathHit)
      this.setCursor('pointer')
    } else {
      this.sceneController.setHoverSelection(new Set())
      this.sceneController.setHoverPathHit(undefined)
      this.setCursor()
    }

    this.canvasController.requestUpdate()
  }

  async handleDrag(eventStream: EventStream, initialEvent: ToolEvent): Promise<void> {
    initialEvent.preventDefault()

    const point = this.localPoint(initialEvent)
    const hit = this.sceneController.hitTestAtPoint(
      point,
      this.sceneController.mouseClickMargin,
      this.sceneController.selection
    )

    if (initialEvent.detail === 2 || initialEvent.myTapCount === 2) {
      initialEvent.preventDefault()
      eventStream.done()
      this.handleDoubleClick(hit)
      return
    }

    const additiveSelection =
      initialEvent.shiftKey || initialEvent.metaKey || initialEvent.ctrlKey

    this.dragState = {
      mode: 'pending',
      anchorPoint: point,
      currentPoint: point,
      pendingHit: hit,
      additiveSelection,
      initialSelection: new Set(this.sceneController.selection),
      initialSelectedPathHit: this.sceneController.selectedPathHit,
      selectionToRestore: new Set(),
      activePointIndices: [],
      pathSnapshot: new Map(),
      didMove: false,
      pointToggleOnClick: undefined,
    }

    if (hit.type === 'point' || hit.type === 'handle') {
      this.preparePointInteraction(hit, additiveSelection)
    }

    let lastEvent: ToolEvent | undefined
    for await (const event of asyncEventIterator(eventStream)) {
      lastEvent = event
      this.handleDragMove(event)
    }

    this.handleDragEnd(lastEvent)
    this.dragState = this.createInitialDragState()
  }

  private handleDragMove(event: ToolEvent) {
    const currentPoint = this.localPoint(event)
    this.dragState.currentPoint = currentPoint

    if (
      this.dragState.mode === 'pending' &&
      BaseTool.shouldInitiateDrag(this.dragState.anchorPoint, currentPoint)
    ) {
      this.dragState.mode = this.resolveDragMode(this.dragState.pendingHit)
      this.dragState.didMove = true
      this.beginResolvedMode(event)
    }

    if (this.dragState.mode === 'pending') {
      return
    }

    this.dragState.didMove = true

    if (this.dragState.mode === 'rect-select') {
      this.updateRectSelection(currentPoint)
      this.canvasController.requestUpdate()
      return
    }

    const path = this.sceneModel.glyph?.glyph.path
    if (!path) {
      return
    }

    const dx = currentPoint.x - this.dragState.anchorPoint.x
    const dy = currentPoint.y - this.dragState.anchorPoint.y

    if (
      this.dragState.mode === 'point-drag' ||
      this.dragState.mode === 'line-segment-drag' ||
      this.dragState.mode === 'curve-segment-drag'
    ) {
      for (const index of this.dragState.activePointIndices) {
        const snapshotPoint = this.dragState.pathSnapshot.get(index)
        if (!snapshotPoint) continue
        this.updatePointPosition(path, index, snapshotPoint.x + dx, snapshotPoint.y + dy)
      }
    } else if (this.dragState.mode === 'curve-segment-deform') {
      this.deformDraggedSegment(path, this.dragState.activePointIndices, dx, dy)
    }

    this.invalidateGlyphPaths()
    this.canvasController.requestUpdate()
  }

  private handleDragEnd(_event?: ToolEvent) {
    let finalRectSelection: Set<string> | undefined
    if (this.dragState.mode === 'rect-select') {
      finalRectSelection = this.getSelectionInRect(this.dragState.currentPoint)
      this.sceneModel.selectionRect = undefined
    }

    if (!this.dragState.didMove) {
      this.handleClick(this.dragState.pendingHit)
      this.canvasController.requestUpdate()
      return
    }

    if (!this.sceneModel.glyph?.glyph.path) {
      return
    }

    this.commitMovedPoints()
    this.restoreSelectionAfterDrag(finalRectSelection)
    this.sceneController.setHoverSelection(new Set())
    this.sceneController.setHoverPathHit(undefined)
    this.canvasController.requestUpdate()
  }

  private handleClick(hit: HitTestResult) {
    if (hit.type === 'point' || hit.type === 'handle') {
      const selectionKey = `point/${hit.pointIndex}`
      if (this.dragState.pointToggleOnClick) {
        const nextSelection = new Set(this.dragState.initialSelection)
        if (this.dragState.pointToggleOnClick.remove) {
          nextSelection.delete(this.dragState.pointToggleOnClick.selectionKey)
        } else {
          nextSelection.add(this.dragState.pointToggleOnClick.selectionKey)
        }
        this.sceneController.setSelection(nextSelection)
      } else {
        if (this.dragState.additiveSelection) {
          const nextSelection = new Set(this.dragState.initialSelection)
          nextSelection.add(selectionKey)
          this.sceneController.setSelection(nextSelection)
        } else {
          this.sceneController.setSelection(new Set([selectionKey]))
        }
      }
      this.sceneController.setSelectedPathHit(undefined)
      return
    }

    if (hit.type === 'line-segment' || hit.type === 'curve-segment') {
      this.sceneController.setSelection(new Set())
      this.sceneController.setSelectedPathHit(hit.pathHit)
      return
    }

    if (hit.type === 'empty') {
      this.sceneController.setSelection(new Set())
      this.sceneController.setSelectedPathHit(undefined)
      return
    }

    if (hit.type === 'contour-interior') {
      this.sceneController.setSelection(new Set())
      this.sceneController.setSelectedPathHit(undefined)
    }
  }

  private handleDoubleClick(hit: HitTestResult) {
    if ((hit.type === 'point' || hit.type === 'handle') && this.sceneModel.glyph?.glyph.path) {
      const idx = hit.pointIndex
      const path = this.sceneModel.glyph.glyph.path
      const pt = this.getPointByIndex(path, idx)

      if (pt?.type === 'onCurve') {
        this.toggleSmooth(path, idx)
        const pointRef = this.sceneModel.glyph.pointRefs?.[idx]
        const glyphId = this.sceneModel.glyph.glyphId
        if (glyphId && pointRef && this.sceneController.onUpdateNodeType) {
          this.sceneController.onUpdateNodeType(
            glyphId,
            pointRef.pathId,
            pointRef.nodeId,
            pt.smooth ? 'corner' : 'smooth'
          )
        }
        this.invalidateGlyphPaths()
        this.canvasController.requestUpdate()
      }
      return
    }

    if (hit.type === 'contour-interior') {
      this.sceneController.setSelection(hit.selection)
      this.sceneController.setSelectedPathHit(undefined)
    }
  }

  private preparePointInteraction(
    hit: Extract<HitTestResult, { type: 'point' | 'handle' }>,
    additiveSelection: boolean
  ) {
    const selectionKey = `point/${hit.pointIndex}`
    const currentSelection = new Set(this.sceneController.selection)
    const isAlreadySelected = currentSelection.has(selectionKey)

    if (!additiveSelection) {
      if (!isAlreadySelected) {
        this.sceneController.setSelection(new Set([selectionKey]))
      }
      this.sceneController.setSelectedPathHit(undefined)
      return
    }

    if (!isAlreadySelected) {
      currentSelection.add(selectionKey)
      this.sceneController.setSelection(currentSelection)
      this.sceneController.setSelectedPathHit(undefined)
      return
    }

    this.dragState.pointToggleOnClick = { selectionKey, remove: true }
  }

  private resolveDragMode(hit: HitTestResult): DragMode {
    if (hit.type === 'point' || hit.type === 'handle') {
      return 'point-drag'
    }

    if (hit.type === 'line-segment') {
      if (this.shouldDragCurrentSelection(hit.pathHit)) {
        return 'point-drag'
      }
      return this.isSameSegment(hit.pathHit, this.dragState.initialSelectedPathHit)
        ? 'line-segment-drag'
        : 'rect-select'
    }

    if (hit.type === 'curve-segment') {
      if (this.shouldDragCurrentSelection(hit.pathHit)) {
        return 'point-drag'
      }
      return this.isSameSegment(hit.pathHit, this.dragState.initialSelectedPathHit)
        ? 'curve-segment-drag'
        : 'curve-segment-deform'
    }

    return 'rect-select'
  }

  private beginResolvedMode(_event: ToolEvent) {
    const hit = this.dragState.pendingHit
    const path = this.sceneModel.glyph?.glyph.path

    if (this.dragState.mode === 'rect-select') {
      this.sceneController.setSelectedPathHit(undefined)
      this.updateRectSelection(this.dragState.currentPoint)
      return
    }

    if (!path) {
      return
    }

    if (this.dragState.mode === 'point-drag') {
      const baseSelection = new Set(this.sceneController.selection)
      this.dragState.selectionToRestore = new Set(baseSelection)
      this.dragState.activePointIndices = this.expandPointIndicesForMove(
        path,
        this.getSelectedPointIndices(baseSelection)
      )
      this.capturePointSnapshot(path, this.dragState.activePointIndices)
      this.sceneController.setSelectedPathHit(undefined)
      this.dragState.pointToggleOnClick = undefined
      return
    }

    if (hit.type !== 'line-segment' && hit.type !== 'curve-segment') {
      return
    }

    this.dragState.activePointIndices = this.expandPointIndicesForMove(
      path,
      hit.pathHit.segment.pointIndices
    )
    this.capturePointSnapshot(path, this.dragState.activePointIndices)

    if (this.dragState.mode === 'line-segment-drag' || this.dragState.mode === 'curve-segment-drag') {
      this.sceneController.setSelectedPathHit(hit.pathHit)
      return
    }

    this.sceneController.setSelectedPathHit(undefined)
  }

  private updateRectSelection(currentPoint: { x: number; y: number }, event?: ToolEvent) {
    const selection = this.getSelectionInRect(currentPoint)
    if (!selection) {
      return
    }

    const selectionRect = {
      xMin: Math.min(this.dragState.anchorPoint.x, currentPoint.x),
      yMin: Math.min(this.dragState.anchorPoint.y, currentPoint.y),
      xMax: Math.max(this.dragState.anchorPoint.x, currentPoint.x),
      yMax: Math.max(this.dragState.anchorPoint.y, currentPoint.y),
    }
    this.sceneModel.selectionRect = selectionRect

    const additiveSelection =
      event?.shiftKey || event?.metaKey || event?.ctrlKey || this.dragState.additiveSelection
    this.sceneController.previewSelection(
      additiveSelection
        ? new Set([...this.dragState.initialSelection, ...selection])
        : selection
    )
  }

  private getSelectionInRect(currentPoint: { x: number; y: number }): Set<string> | undefined {
    if (!this.sceneModel.glyph?.glyph.path) {
      return undefined
    }

    const selectionRect = {
      xMin: Math.min(this.dragState.anchorPoint.x, currentPoint.x),
      yMin: Math.min(this.dragState.anchorPoint.y, currentPoint.y),
      xMax: Math.max(this.dragState.anchorPoint.x, currentPoint.x),
      yMax: Math.max(this.dragState.anchorPoint.y, currentPoint.y),
    }

    const selection = new Set<string>()
    for (const point of this.sceneModel.glyph.glyph.path.iterPoints()) {
      if (
        point.x >= selectionRect.xMin &&
        point.x <= selectionRect.xMax &&
        point.y >= selectionRect.yMin &&
        point.y <= selectionRect.yMax
      ) {
        selection.add(`point/${point.index}`)
      }
    }

    return selection
  }

  private deformDraggedSegment(
    path: {
      setPoint?(index: number, point: { x: number; y: number; type?: string; smooth?: boolean }): void
    },
    pointIndices: number[],
    dx: number,
    dy: number
  ) {
    for (let segmentIndex = 0; segmentIndex < pointIndices.length; segmentIndex += 1) {
      const pointIndex = pointIndices[segmentIndex]
      const snapshotPoint = this.dragState.pathSnapshot.get(pointIndex)
      if (!snapshotPoint || !path.setPoint) {
        continue
      }

      const isEndpoint = segmentIndex === 0 || segmentIndex === pointIndices.length - 1
      const factor = isEndpoint ? 0 : 1
      path.setPoint(pointIndex, {
        x: snapshotPoint.x + dx * factor,
        y: snapshotPoint.y + dy * factor,
        type: snapshotPoint.type,
        smooth: snapshotPoint.smooth,
      })
    }
  }

  private commitMovedPoints() {
    if (!this.sceneModel.glyph?.glyph.path) {
      return
    }

    const glyphId = this.sceneModel.glyph.glyphId
    const pointRefs = this.sceneModel.glyph.pointRefs ?? []
    if (!glyphId || !this.sceneController.onCommitNodePositions) {
      return
    }

    const uniquePointIndices = Array.from(new Set(this.dragState.activePointIndices))
    const dx = this.dragState.currentPoint.x - this.dragState.anchorPoint.x
    const dy = this.dragState.currentPoint.y - this.dragState.anchorPoint.y
    const updates = uniquePointIndices.flatMap((idx) => {
      const pointRef = pointRefs[idx]
      const snapshotPoint = this.dragState.pathSnapshot.get(idx)
      if (!pointRef || !snapshotPoint) {
        return []
      }

      let newPos = { x: snapshotPoint.x, y: snapshotPoint.y }

      if (
        this.dragState.mode === 'point-drag' ||
        this.dragState.mode === 'line-segment-drag' ||
        this.dragState.mode === 'curve-segment-drag'
      ) {
        newPos = {
          x: snapshotPoint.x + dx,
          y: snapshotPoint.y + dy,
        }
      } else if (this.dragState.mode === 'curve-segment-deform') {
        const pointIndex = this.dragState.activePointIndices.indexOf(idx)
        const isEndpoint =
          pointIndex === 0 || pointIndex === this.dragState.activePointIndices.length - 1
        const factor = isEndpoint ? 0 : 1
        newPos = {
          x: snapshotPoint.x + dx * factor,
          y: snapshotPoint.y + dy * factor,
        }
      }

      return [
        {
          pathId: pointRef.pathId,
          nodeId: pointRef.nodeId,
          newPos,
        },
      ]
    })

    if (updates.length > 0) {
      this.sceneController.onCommitNodePositions(glyphId, updates)
    }

  }

  private createInitialDragState() {
    return {
      mode: 'pending' as DragMode,
      anchorPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      pendingHit: { type: 'empty', selection: new Set() } as HitTestResult,
      additiveSelection: false,
      initialSelection: new Set<string>(),
      initialSelectedPathHit: undefined,
      selectionToRestore: new Set<string>(),
      activePointIndices: [],
      pathSnapshot: new Map<number, Point>(),
      didMove: false,
      pointToggleOnClick: undefined,
    }
  }

  private restoreSelectionAfterDrag(finalRectSelection?: Set<string>) {
    if (this.dragState.mode === 'rect-select') {
      const additiveSelection = this.dragState.additiveSelection
      this.sceneController.setSelection(
        additiveSelection && finalRectSelection
          ? new Set([...this.dragState.initialSelection, ...finalRectSelection])
          : finalRectSelection ?? new Set()
      )
      return
    }

    if (this.dragState.mode === 'point-drag') {
      if (this.dragState.selectionToRestore.size > 0) {
        this.sceneController.setSelection(new Set(this.dragState.selectionToRestore))
        return
      }

      if (this.dragState.pendingHit.type === 'point' || this.dragState.pendingHit.type === 'handle') {
        this.sceneController.setSelection(
          new Set([`point/${this.dragState.pendingHit.pointIndex}`])
        )
        return
      }

      this.sceneController.setSelection(new Set(this.dragState.initialSelection))
      return
    }

    if (
      (this.dragState.mode === 'line-segment-drag' ||
        this.dragState.mode === 'curve-segment-drag') &&
      this.sceneController.selectedPathHit
    ) {
      this.sceneController.setSelectedPathHit(this.sceneController.selectedPathHit)
    }
  }

  private shouldDragCurrentSelection(pathHit: PathHitInfo) {
    if (!this.sceneController.selection.size) {
      return false
    }
    const selectedPointIndices = new Set(this.getSelectedPointIndices(this.sceneController.selection))
    return pathHit.segment.pointIndices.some((index) => selectedPointIndices.has(index))
  }

  private expandPointIndicesForMove(
    path: {
      getPoint?(index: number): Point
      contourInfo?: Array<{ endPoint: number; isClosed?: boolean }>
    },
    pointIndices: number[]
  ): number[] {
    const expanded = new Set<number>(pointIndices)

    if (!path.getPoint || !path.contourInfo?.length) {
      return [...expanded]
    }

    for (const index of pointIndices) {
      const point = path.getPoint(index)
      if (!point || point.type !== 'onCurve') {
        continue
      }

      for (const attachedIndex of this.findAttachedHandleIndices(path, index)) {
        expanded.add(attachedIndex)
      }
    }

    return [...expanded]
  }

  private findAttachedHandleIndices(
    path: {
      getPoint?(index: number): Point
      contourInfo?: Array<{ endPoint: number; isClosed?: boolean }>
    },
    pointIndex: number
  ): number[] {
    if (!path.getPoint || !path.contourInfo?.length) {
      return []
    }

    const contourBounds = this.findContourBounds(path.contourInfo, pointIndex)
    if (!contourBounds) {
      return []
    }

    const attached = new Set<number>()
    this.collectHandleRun(path, pointIndex, -1, contourBounds, attached)
    this.collectHandleRun(path, pointIndex, 1, contourBounds, attached)
    return [...attached]
  }

  private collectHandleRun(
    path: {
      getPoint?(index: number): Point
    },
    startIndex: number,
    direction: -1 | 1,
    contourBounds: { start: number; end: number; isClosed: boolean },
    attached: Set<number>
  ) {
    if (!path.getPoint) {
      return
    }

    let currentIndex = startIndex
    while (true) {
      currentIndex += direction

      if (currentIndex < contourBounds.start || currentIndex > contourBounds.end) {
        if (!contourBounds.isClosed) {
          return
        }
        currentIndex =
          direction > 0 ? contourBounds.start : contourBounds.end
      }

      if (currentIndex === startIndex) {
        return
      }

      const point = path.getPoint(currentIndex)
      if (!point || point.type === 'onCurve') {
        return
      }

      attached.add(currentIndex)
    }
  }

  private findContourBounds(
    contourInfo: Array<{ endPoint: number; isClosed?: boolean }>,
    pointIndex: number
  ): { start: number; end: number; isClosed: boolean } | null {
    let start = 0
    for (const contour of contourInfo) {
      if (pointIndex <= contour.endPoint) {
        return {
          start,
          end: contour.endPoint,
          isClosed: contour.isClosed ?? true,
        }
      }
      start = contour.endPoint + 1
    }
    return null
  }

  private capturePointSnapshot(
    path: { getPoint?(index: number): Point },
    pointIndices: number[]
  ) {
    this.dragState.pathSnapshot = new Map()
    for (const index of pointIndices) {
      const point = path.getPoint?.(index)
      if (point) {
        this.dragState.pathSnapshot.set(index, { ...point })
      }
    }
  }

  private isSameSegment(a?: PathHitInfo, b?: PathHitInfo) {
    return !!a?.segment.key && !!b?.segment.key && a.segment.key === b.segment.key
  }

  private getSelectedPointIndices(selection: Set<string>): number[] {
    const selectedPointIndices: number[] = []
    for (const item of selection) {
      const match = item.match(/^point\/(\d+)$/)
      if (match) {
        selectedPointIndices.push(parseInt(match[1], 10))
      }
    }
    return selectedPointIndices
  }

  private getPointByIndex(
    path: {
      iterPoints(): Generator<{ x: number; y: number; index: number; type?: string; smooth?: boolean }, void>
    },
    index: number
  ) {
    for (const pt of path.iterPoints()) {
      if (pt.index === index) return pt
    }
    return null
  }

  private updatePointPosition(
    path: {
      setPoint?(index: number, point: { x: number; y: number; type?: string; smooth?: boolean }): void
      getPoint?(index: number): { x: number; y: number; type?: string; smooth?: boolean }
      coordinates?: Float64Array
    },
    index: number,
    x: number,
    y: number
  ) {
    if (path.setPoint) {
      const existingPoint = path.getPoint?.(index)
      path.setPoint(index, {
        x,
        y,
        type: existingPoint?.type,
        smooth: existingPoint?.smooth,
      })
    } else if (path.coordinates) {
      path.coordinates[index * 2] = x
      path.coordinates[index * 2 + 1] = y
    }
  }

  private toggleSmooth(
    path: {
      pointTypes?: Uint8Array
    },
    index: number
  ) {
    if (path.pointTypes) {
      const POINT_SMOOTH_FLAG = 0x08
      path.pointTypes[index] ^= POINT_SMOOTH_FLAG
    }
  }

  private invalidateGlyphPaths() {
    if (this.sceneModel.glyph?.glyph) {
      const glyph = this.sceneModel.glyph.glyph
      ;(glyph as { flattenedPath2d?: Path2D }).flattenedPath2d = undefined
      ;(glyph as { closedContoursPath2d?: Path2D }).closedContoursPath2d = undefined
    }
  }
}

async function* asyncEventIterator(
  eventStream: EventStream
): AsyncGenerator<ToolEvent, void, unknown> {
  while (true) {
    const event = await eventStream.next()
    if (event === undefined) break
    yield event
  }
}
