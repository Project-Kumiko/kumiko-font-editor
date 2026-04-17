// 場景控制器 - 管理編輯狀態和互動

import type { CanvasController } from '../canvas/CanvasController'
import type { SceneModel } from '../canvas/SceneView'
import { PointerTool } from './PointerTool'
import { PenTool } from './PenTool'
import type { BaseTool, ToolEvent } from './BaseTool'

export interface SceneControllerOptions {
  canvasController: CanvasController
  model: SceneModel
  onSelectionChange?: (selection: Set<string>) => void
  onUpdateNodePosition?: (
    glyphId: string,
    pathId: string,
    nodeId: string,
    newPos: { x: number; y: number }
  ) => void
  onCommitNodePositions?: (
    glyphId: string,
    updates: Array<{
      pathId: string
      nodeId: string
      newPos: { x: number; y: number }
    }>
  ) => void
  onUpdateNodeType?: (
    glyphId: string,
    pathId: string,
    nodeId: string,
    type: 'corner' | 'smooth'
  ) => void
}

export class SceneController {
  canvasController: CanvasController
  sceneModel: SceneModel

  selection: Set<string> = new Set()
  hoverSelection: Set<string> = new Set()
  hoverPathHit?: { segment: { points: { x: number; y: number }[] }; x: number; y: number }

  mouseClickMargin = 10

  private tools: Map<string, BaseTool> = new Map()
  private activeTool: BaseTool | null = null
  private _eventStream: EventStreamImpl | null = null
  private onSelectionChange: SceneControllerOptions['onSelectionChange']
  onUpdateNodePosition: SceneControllerOptions['onUpdateNodePosition']
  onCommitNodePositions: SceneControllerOptions['onCommitNodePositions']
  onUpdateNodeType: SceneControllerOptions['onUpdateNodeType']

  constructor(options: SceneControllerOptions) {
    this.canvasController = options.canvasController
    this.sceneModel = options.model
    this.onSelectionChange = options.onSelectionChange
    this.onUpdateNodePosition = options.onUpdateNodePosition
    this.onCommitNodePositions = options.onCommitNodePositions
    this.onUpdateNodeType = options.onUpdateNodeType

    // Initialize tools
    this.tools.set(
      'pointer',
      new PointerTool(this.canvasController, this as any, this.sceneModel)
    )
    this.tools.set('pen', new PenTool(this.canvasController, this as any, this.sceneModel))

    // Set default tool
    this.setActiveTool('pointer')

    // Bind events
    this.bindEvents()
  }

  setActiveTool(toolName: string) {
    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.deactivate()
    }

    // Activate new tool
    this.activeTool = this.tools.get(toolName) || null
    if (this.activeTool) {
      this.activeTool.activate()
    }
  }

  setSelection(selection: Set<string>) {
    this.selection = selection
    this.onSelectionChange?.(selection)
  }

  private bindEvents() {
    const canvas = this.canvasController.canvas

    // Mouse events
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
    canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this))

    // Prevent context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private handleMouseDown(event: MouseEvent) {
    if (!this.activeTool) return

    const toolEvent = this.mouseEventToToolEvent(event)

    // Create event stream for drag handling
    this._eventStream = new EventStreamImpl()

    // Start drag
    this.activeTool.handleDrag(this._eventStream, toolEvent).catch(console.error)
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.activeTool) return

    const toolEvent = this.mouseEventToToolEvent(event)

    // Pass to event stream if dragging
    if (this._eventStream && !this._eventStream.done_) {
      this._eventStream.push(toolEvent)
    } else {
      // Just hover
      this.activeTool.handleHover(toolEvent)
    }
  }

  private handleMouseUp(_event: MouseEvent) {
    if (this._eventStream) {
      this._eventStream.end()
      this._eventStream = null
    }
  }

  private handleDoubleClick(_event: MouseEvent) {
    // Handled in mousedown via detail count
  }

  private mouseEventToToolEvent(event: MouseEvent): ToolEvent {
    const rect = this.canvasController.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    return {
      x,
      y,
      pageX: event.pageX,
      pageY: event.pageY,
      detail: event.detail,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      preventDefault: () => event.preventDefault(),
    }
  }

  // Hit testing methods

  localPoint(event: { pageX: number; pageY: number }): { x: number; y: number } {
    return this.canvasController.localPoint({ x: event.pageX, y: event.pageY })
  }

  selectionAtPoint(
    point: { x: number; y: number },
    size: number,
    _currentSelection: Set<string>,
    _hoverSelection: Set<string>,
    _altKey: boolean
  ): { selection: Set<string>; pathHit?: { segment: { points: { x: number; y: number }[] }; x: number; y: number } } {
    const selection = new Set<string>()

    // Check if point is near a node
    const glyph = this.sceneModel.glyph
    if (glyph?.glyph.path) {
      const path = glyph.glyph.path

      for (const pt of path.iterPoints()) {
        const dist = Math.sqrt((pt.x - point.x) ** 2 + (pt.y - point.y) ** 2)
        if (dist <= size / this.canvasController.magnification) {
          selection.add(`point/${pt.index}`)
          return { selection }
        }
      }
    }

    // Check for path hit
    const pathHit = this.pathHitAtPoint(point, size)
    if (pathHit) {
      return { selection, pathHit }
    }

    return { selection }
  }

  pathHitAtPoint(
    point: { x: number; y: number },
    size: number
  ): { segment: { points: { x: number; y: number }[] }; x: number; y: number } | null {
    const glyph = this.sceneModel.glyph
    if (!glyph?.glyph.path) return null

    const threshold = size / this.canvasController.magnification
    const path = glyph.glyph.path

    // Check segments
    for (let i = 0; i < path.numContours; i++) {
      if (!path.iterContourSegments) {
        return null
      }

      for (const segment of path.iterContourSegments(i)) {
        const pts = segment.points
        if (pts.length < 2) continue

        // Check distance to line segment
        for (let j = 0; j < pts.length - 1; j++) {
          const p1 = pts[j]
          const p2 = pts[j + 1]
          const dist = this.pointToSegmentDistance(point, p1, p2)

          if (dist <= threshold) {
            return {
              segment: { points: [p1, p2] },
              x: point.x,
              y: point.y,
            }
          }
        }
      }
    }

    return null
  }

  private pointToSegmentDistance(
    point: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y

    if (dx === 0 && dy === 0) {
      return Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2)
    }

    const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy)))

    const projX = p1.x + t * dx
    const projY = p1.y + t * dy

    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2)
  }
}

// Event stream implementation
class EventStreamImpl {
  private events: ToolEvent[] = []
  private resolvers: ((event: ToolEvent | undefined) => void)[] = []
  done_ = false

  push(event: ToolEvent) {
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!
      resolve(event)
    } else {
      this.events.push(event)
    }
  }

  end() {
    this.done_ = true
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!
      resolve(undefined)
    }
  }

  async next(): Promise<ToolEvent | undefined> {
    if (this.events.length > 0) {
      return this.events.shift()
    }

    if (this.done_) {
      return undefined
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve)
    })
  }

  done() {
    this.end()
  }
}
