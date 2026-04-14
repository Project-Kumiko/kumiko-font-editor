// Pen 工具 - 繪製路徑
// 從 Fontra edit-tools-pen.js 移植

import { BaseTool, type ToolEvent, type EventStream } from './BaseTool'
import type { UnpackedContour, VarPackedPath } from '../font/VarPackedPath'

export class PenTool extends BaseTool {
  identifier = 'pen-tool'

  private pathInsertHandles?: {
    points: { x: number; y: number }[]
    hit: { segment: { points: { x: number; y: number }[] } }
  }

  handleHover(event: ToolEvent): void {
    if (!this.sceneModel.canEdit) {
      // Fall back to pointer tool behavior
      this.setCursor()
      return
    }

    this.setCursor('crosshair')

    // Check for path insertion point
    const { insertHandles, targetPoint } = this._getPathConnectTargetPoint(event)

    if (insertHandles) {
      this.pathInsertHandles = insertHandles
      this.canvasController.requestUpdate()
    } else if (targetPoint) {
      // Show connection target
      this.canvasController.requestUpdate()
    }
  }

  async handleDrag(eventStream: EventStream, initialEvent: ToolEvent): Promise<void> {
    if (!this.sceneModel.canEdit) {
      eventStream.done()
      return
    }

    if (this.pathInsertHandles) {
      await this._handleInsertPoint()
      eventStream.done()
      return
    }

    // Start adding points
    await this._handleAddPoints(eventStream, initialEvent)
  }

  private async _handleAddPoints(eventStream: EventStream, initialEvent: ToolEvent): Promise<void> {
    const startPoint = this.localPoint(initialEvent)
    let lastPoint = startPoint
    let isNewContour = true

    // Drag loop
    for await (const event of asyncEventIterator(eventStream)) {
      if (!event) break

      const currentPoint = this.localPoint(event)

      // Create preview line
      if (isNewContour) {
        // Start new contour
        // This would create a visual preview
      }

      lastPoint = currentPoint
    }

    // Commit the new point/contour
    if (this.sceneModel.glyph?.glyph.path) {
      this.addPointToPath(this.sceneModel.glyph.glyph.path, lastPoint, isNewContour)
      this.invalidateGlyphPaths()
    }

    this.canvasController.requestUpdate()
  }

  private async _handleInsertPoint(): Promise<void> {
    if (!this.pathInsertHandles || !this.sceneModel.glyph?.glyph.path) return

    const path = this.sceneModel.glyph.glyph.path
    const hit = this.pathInsertHandles.hit

    // Insert new point at the hit location
    // This requires implementation based on VarPackedPath

    this.pathInsertHandles = undefined
    this.invalidateGlyphPaths()
    this.canvasController.requestUpdate()
  }

  private _getPathConnectTargetPoint(event: ToolEvent): {
    insertHandles?: { points: { x: number; y: number }[]; hit: { segment: { points: { x: number; y: number }[] } } }
    targetPoint?: { x: number; y: number; segment?: { points: { x: number; y: number }[] } }
  } {
    // Check if we're hovering over an existing path
    const point = this.localPoint(event)
    const size = this.sceneController.mouseClickMargin

    const hit = this.sceneController.pathHitAtPoint(point, size)
    if (hit?.segment?.points?.length === 2 && event.altKey) {
      // Calculate insert handles
      const pt1 = hit.segment.points[0]
      const pt2 = hit.segment.points[1]
      return {
        insertHandles: {
          points: [
            { x: (pt1.x * 2 + pt2.x) / 3, y: (pt1.y * 2 + pt2.y) / 3 },
            { x: (pt1.x + pt2.x * 2) / 3, y: (pt1.y + pt2.y * 2) / 3 },
          ],
          hit,
        },
      }
    }

    return { targetPoint: point }
  }

  private addPointToPath(
    path: VarPackedPath,
    point: { x: number; y: number },
    isNewContour: boolean
  ): void {
    if (isNewContour) {
      path.appendUnpackedContour({
        points: [{ x: point.x, y: point.y, type: 'onCurve' }],
        isClosed: false,
      })
    }
  }

  private invalidateGlyphPaths(): void {
    if (this.sceneModel.glyph?.glyph) {
      const glyph = this.sceneModel.glyph.glyph
      ;(glyph as { flattenedPath2d?: Path2D }).flattenedPath2d = undefined
      ;(glyph as { closedContoursPath2d?: Path2D }).closedContoursPath2d = undefined
    }
  }
}

// Async event iterator helper
async function* asyncEventIterator(
  eventStream: { next(): Promise<ToolEvent | undefined>; done(): void }
): AsyncGenerator<ToolEvent, void, unknown> {
  while (true) {
    const event = await eventStream.next()
    if (event === undefined) break
    yield event
  }
}
