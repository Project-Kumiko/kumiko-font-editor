// 指標工具 - 節點選取和拖曳
// 從 Fontra edit-tools-pointer.js 移植

import { BaseTool, type ToolEvent, type EventStream } from './BaseTool'
import type { CanvasController } from '../canvas/CanvasController'

const TRANSFORM_HANDLE_MARGIN = 6
const TRANSFORM_HANDLE_SIZE = 8

export class PointerTool extends BaseTool {
  identifier = 'pointer-tool'

  private dragState: {
    isDragging: boolean
    startPoint: { x: number; y: number }
    initialSelection: Set<string>
    selectedPointIndices: number[]
  } = {
    isDragging: false,
    startPoint: { x: 0, y: 0 },
    initialSelection: new Set(),
    selectedPointIndices: [],
  }

  handleHover(event: ToolEvent): void {
    const point = this.localPoint(event)
    const size = this.sceneController.mouseClickMargin

    const { selection, pathHit } = this.sceneController.selectionAtPoint(
      point,
      size,
      this.sceneController.selection,
      this.sceneController.hoverSelection,
      event.altKey
    )

    this.sceneController.hoverSelection = selection
    this.sceneController.hoverPathHit = pathHit

    // Update cursor
    if (selection.size > 0 || pathHit) {
      this.setCursor('pointer')
    } else {
      this.setCursor()
    }

    // Request redraw
    this.canvasController.requestUpdate()
  }

  async handleDrag(eventStream: EventStream, initialEvent: ToolEvent): Promise<void> {
    const point = this.localPoint(initialEvent)
    const size = this.sceneController.mouseClickMargin

    const { selection, pathHit } = this.sceneController.selectionAtPoint(
      point,
      size,
      this.sceneController.selection,
      this.sceneController.hoverSelection,
      initialEvent.altKey
    )

    // Handle double click
    if (initialEvent.detail === 2 || initialEvent.myTapCount === 2) {
      initialEvent.preventDefault()
      eventStream.done()
      await this.handleDoubleClick(selection, point)
      return
    }

    // If no glyph is being edited, just select
    if (!this.sceneModel.canEdit) {
      this.sceneController.selection = selection
      eventStream.done()
      return
    }

    // Start drag operation
    this.dragState = {
      isDragging: true,
      startPoint: point,
      initialSelection: new Set(this.sceneController.selection),
      selectedPointIndices: [],
    }

    // Parse selection to get point indices
    for (const item of this.sceneController.selection) {
      const match = item.match(/^point\/(\d+)$/)
      if (match) {
        this.dragState.selectedPointIndices.push(parseInt(match[1], 10))
      }
    }

    // If clicked on unselected point, select it
    if (selection.size > 0 && !this.hasIntersection(this.sceneController.selection, selection)) {
      this.sceneController.selection = selection
      this.dragState.selectedPointIndices = []
      for (const item of selection) {
        const match = item.match(/^point\/(\d+)$/)
        if (match) {
          this.dragState.selectedPointIndices.push(parseInt(match[1], 10))
        }
      }
    }

    // Drag loop
    let lastEvent: ToolEvent | undefined
    for await (const event of asyncEventIterator(eventStream)) {
      if (!event) break
      lastEvent = event
      await this.handleDragMove(event)
    }

    // Drag ended
    if (lastEvent) {
      await this.handleDragEnd(lastEvent)
    }

    this.dragState.isDragging = false
  }

  private async handleDragMove(event: ToolEvent): Promise<void> {
    if (!this.dragState.isDragging) return

    const currentPoint = this.localPoint(event)
    const dx = currentPoint.x - this.dragState.startPoint.x
    const dy = currentPoint.y - this.dragState.startPoint.y

    // Update drag start point for next move
    this.dragState.startPoint = currentPoint

    // Move selected points
    if (this.dragState.selectedPointIndices.length > 0 && this.sceneModel.glyph?.glyph.path) {
      const path = this.sceneModel.glyph.glyph.path

      for (const idx of this.dragState.selectedPointIndices) {
        const pt = this.getPointByIndex(path, idx)
        if (pt) {
          const newX = pt.x + dx
          const newY = pt.y + dy
          // Update point position
          this.updatePointPosition(path, idx, newX, newY)
        }
      }

      // Invalidate cached paths
      this.invalidateGlyphPaths()
    }

    this.canvasController.requestUpdate()
  }

  private async handleDragEnd(event: ToolEvent): Promise<void> {
    // Commit changes to store
    // This will be handled by the store integration
  }

  private async handleDoubleClick(selection: Set<string>, point: { x: number; y: number }): Promise<void> {
    // Toggle smooth/corner for clicked point
    for (const item of selection) {
      const match = item.match(/^point\/(\d+)$/)
      if (match && this.sceneModel.glyph?.glyph.path) {
        const idx = parseInt(match[1], 10)
        const path = this.sceneModel.glyph.glyph.path
        const pt = this.getPointByIndex(path, idx)

        if (pt && pt.type === 'onCurve') {
          // Toggle smooth
          this.toggleSmooth(path, idx)
          this.invalidateGlyphPaths()
          this.canvasController.requestUpdate()
        }
      }
    }
  }

  private hasIntersection(set1: Set<string>, set2: Set<string>): boolean {
    for (const item of set1) {
      if (set2.has(item)) return true
    }
    return false
  }

  private getPointByIndex(path: { iterPoints(): Generator<{ x: number; y: number; index: number; type?: string; smooth?: boolean }, void> }, index: number) {
    for (const pt of path.iterPoints()) {
      if (pt.index === index) return pt
    }
    return null
  }

  private updatePointPosition(
    path: { setPoint?(index: number, point: { x: number; y: number }): void; coordinates?: Float64Array },
    index: number,
    x: number,
    y: number
  ): void {
    if (path.setPoint) {
      path.setPoint(index, { x, y })
    } else if (path.coordinates) {
      path.coordinates[index * 2] = x
      path.coordinates[index * 2 + 1] = y
    }

    // Notify store of the position change for undo/redo functionality
    if (this.sceneController.onUpdateNodePosition && this.sceneModel.glyph) {
      // We need to determine the glyphId, pathId, and nodeId
      // For now, we'll use simplified indices as in CanvasWorkspace
      const glyphId = this.sceneModel.glyph?.id || 'unknown'
      const pathId = path.id || 'unknown' // Assuming path has an id property
      const nodeId = String(index) // Using index as nodeId for simplicity

      this.sceneController.onUpdateNodePosition(glyphId, pathId, nodeId, { x, y })
    }
  }

  private toggleSmooth(
    path: { iterPoints(): Generator<{ x: number; y: number; index: number; type?: string; smooth?: boolean }, void>; pointTypes?: Uint8Array },
    index: number
  ): void {
    if (path.pointTypes) {
      const POINT_SMOOTH_FLAG = 0x08
      path.pointTypes[index] ^= POINT_SMOOTH_FLAG
    }
  }

  private invalidateGlyphPaths(): void {
    if (this.sceneModel.glyph?.glyph) {
      const glyph = this.sceneModel.glyph.glyph
      // Clear cached Path2D objects
      ;(glyph as { flattenedPath2d?: Path2D }).flattenedPath2d = undefined
      ;(glyph as { closedContoursPath2d?: Path2D }).closedContoursPath2d = undefined
    }
  }
}

// Async event iterator helper
async function* asyncEventIterator(
  eventStream: EventStream
): AsyncGenerator<ToolEvent, void, unknown> {
  while (true) {
    const event = await eventStream.next()
    if (event === undefined) break
    yield event
  }
}
