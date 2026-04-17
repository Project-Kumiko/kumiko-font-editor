// 從 Fontra 移植的 CanvasController
// 處理 Canvas 基礎渲染、縮放、平移和事件處理

import type { SceneView } from './SceneView'
import type { SceneModel } from './SceneView'

const MIN_MAGNIFICATION = 0.005
const MAX_MAGNIFICATION = 200

export interface Point {
  x: number
  y: number
}

export interface Rect {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

export type ViewBoxChangeReason =
  | 'canvas-size'
  | 'origin'
  | 'magnification'
  | 'set-view-box'

export interface ViewBoxChangeEvent {
  detail: ViewBoxChangeReason
}

export class CanvasController {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  sceneView: SceneView | null = null
  sceneModel: SceneModel | null = null

  magnification = 1
  origin: Point = { x: 0, y: 0 }

  private _magnificationChangedCallback: ((mag: number) => void) | null = null
  private _resizeObserver: ResizeObserver | null = null
  private _initialScrollTarget: EventTarget | null = null
  private _scrollTimerID: number | null = null
  private _previousOffsets: {
    parentOffsetX: number
    parentOffsetY: number
  } | null = null
  private _initialMagnification = 0

  constructor(
    canvas: HTMLCanvasElement,
    magnificationChangedCallback?: (mag: number) => void
  ) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D context')
    }
    this.context = ctx

    this.origin = {
      x: this.canvasWidth / 2,
      y: 0.85 * this.canvasHeight,
    }

    this._magnificationChangedCallback = magnificationChangedCallback ?? null

    // Setup resize observer
    this._resizeObserver = new ResizeObserver(() => {
      this.setupSize()
      this.draw()
    })
    this._resizeObserver.observe(this.canvas.parentElement!)

    this._setupScrollBlocker()

    // Event listeners
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this))

    // Safari pinch zoom
    this.canvas.addEventListener(
      'gesturestart',
      this.handleSafariGestureStart.bind(this)
    )
    this.canvas.addEventListener(
      'gesturechange',
      this.handleSafariGestureChange.bind(this)
    )
    this.canvas.addEventListener(
      'gestureend',
      this.handleSafariGestureEnd.bind(this)
    )

    this.setupSize()
    this.requestUpdate()
  }

  private _setupScrollBlocker() {
    this._initialScrollTarget = null
    this._scrollTimerID = null

    document.addEventListener('wheel', (event: WheelEvent) => {
      if (this._scrollTimerID) {
        clearTimeout(this._scrollTimerID)
      }
      if (!this._initialScrollTarget) {
        this._initialScrollTarget = event.target as EventTarget
      }
      this._scrollTimerID = window.setTimeout(() => {
        this._initialScrollTarget = null
      }, 100)
    })
  }

  private _shouldBlockScroll(_event: WheelEvent): boolean {
    return !!(
      this._initialScrollTarget && this._initialScrollTarget !== this.canvas
    )
  }

  get canvasWidth(): number {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    return rect?.width ?? 0
  }

  get canvasHeight(): number {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    return rect?.height ?? 0
  }

  get devicePixelRatio(): number {
    return window.devicePixelRatio
  }

  setupSize() {
    const width = this.canvasWidth
    const height = this.canvasHeight
    const scale = this.devicePixelRatio

    this.canvas.width = Math.floor(width * scale)
    this.canvas.height = Math.floor(height * scale)
    this.canvas.style.width = width + 'px'
    this.canvas.style.height = height + 'px'

    const parentOffsetX = this.canvas.parentElement?.offsetLeft ?? 0
    const parentOffsetY = this.canvas.parentElement?.offsetTop ?? 0

    if (this._previousOffsets) {
      // Try to keep the scroll position constant
      const dx = this._previousOffsets.parentOffsetX - parentOffsetX
      const dy = this._previousOffsets.parentOffsetY - parentOffsetY
      this.origin.x += dx
      this.origin.y += dy
    }
    this._previousOffsets = { parentOffsetX, parentOffsetY }
    this._dispatchEvent('viewBoxChanged', 'canvas-size')
  }

  draw() {
    const scale = this.devicePixelRatio
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (!this.sceneView) {
      console.log('No sceneView to draw')
      return
    }

    if (!this.sceneModel) {
      console.log('No sceneModel to draw')
      return
    }

    try {
      withSavedState(this.context, () => {
        this.context.scale(scale, scale)
        this.context.translate(this.origin.x, this.origin.y)
        this.context.scale(this.magnification, -this.magnification)
        this.sceneView!.draw(this, this.sceneModel!)
      })
    } catch (error) {
      console.error('Error in draw:', error)
      throw error
    }
  }

  requestUpdate() {
    requestAnimationFrame(() => this.draw())
  }

  // Event handlers

  handleWheel(event: WheelEvent) {
    event.preventDefault()

    if (this._shouldBlockScroll(event)) {
      return
    }

    const { deltaX, deltaY } = event

    // Detect "clunky" scroll wheel
    const clunkyScrollWheel =
      Math.abs(deltaY) > 50 &&
      Math.abs(
        (event as WheelEvent & { wheelDeltaY: number }).wheelDeltaY / deltaY
      ) < 2

    if (event.ctrlKey || event.altKey) {
      const scaleDown = clunkyScrollWheel ? 500 : event.ctrlKey ? 100 : 300
      this._doPinchMagnify(event, 1 - deltaY / scaleDown)
    } else {
      const scaleDown = clunkyScrollWheel ? 3 : 1
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.origin.x -= deltaX / scaleDown
      } else {
        this.origin[event.shiftKey ? 'x' : 'y'] -= deltaY / scaleDown
      }
      this.requestUpdate()
      this._dispatchEvent('viewBoxChanged', 'origin')
    }
  }

  handleSafariGestureStart(event: Event) {
    event.preventDefault()
    const gestureEvent = event as unknown as { scale: number }
    this._initialMagnification = this.magnification
    this._doPinchMagnify(
      gestureEvent as unknown as MouseEvent,
      gestureEvent.scale
    )
  }

  handleSafariGestureChange(event: Event) {
    event.preventDefault()
    const gestureEvent = event as unknown as { scale: number }
    const zoomFactor =
      (this._initialMagnification * gestureEvent.scale) / this.magnification
    this._doPinchMagnify(gestureEvent as unknown as MouseEvent, zoomFactor)
  }

  handleSafariGestureEnd(event: Event) {
    event.preventDefault()
    this._initialMagnification = 0
  }

  private _doPinchMagnify(
    event: { pageX: number; pageY: number },
    zoomFactor: number
  ) {
    const center = this.localPoint({ x: event.pageX, y: event.pageY })
    const prevMagnification = this.magnification

    this.magnification = this.magnification * zoomFactor
    this.magnification = Math.min(
      Math.max(this.magnification, MIN_MAGNIFICATION),
      MAX_MAGNIFICATION
    )
    zoomFactor = this.magnification / prevMagnification

    // Adjust origin
    this.origin.x += (1 - zoomFactor) * center.x * prevMagnification
    this.origin.y -= (1 - zoomFactor) * center.y * prevMagnification

    this._magnificationChangedCallback?.(this.magnification)
    this.requestUpdate()
    this._dispatchEvent('viewBoxChanged', 'magnification')
  }

  // Coordinate transformation

  localPoint(event: Point): Point {
    const x =
      (event.x - (this.canvas.parentElement?.offsetLeft ?? 0) - this.origin.x) /
      this.magnification
    const y =
      -(event.y - (this.canvas.parentElement?.offsetTop ?? 0) - this.origin.y) /
      this.magnification

    return { x, y }
  }

  canvasPoint(point: Point): Point {
    const x = point.x * this.magnification + this.origin.x
    const y = -point.y * this.magnification + this.origin.y
    return { x, y }
  }

  get onePixelUnit(): number {
    return 1 / this.magnification
  }

  getViewBox(): Rect {
    const width = this.canvasWidth
    const height = this.canvasHeight
    const left = this.canvas.parentElement?.offsetLeft ?? 0
    const top = this.canvas.parentElement?.offsetTop ?? 0

    const bottomLeft = this.localPoint({ x: 0 + left, y: 0 + top })
    const topRight = this.localPoint({ x: width + left, y: height + top })

    return normalizeRect({
      xMin: bottomLeft.x,
      yMin: bottomLeft.y,
      xMax: topRight.x,
      yMax: topRight.y,
    })
  }

  setViewBox(viewBox: Rect) {
    const validated = validateRect(viewBox)
    this.magnification = this._getProposedViewBoxMagnification(validated)
    const canvasCenter = this.canvasPoint(rectCenter(validated))
    this.origin.x = this.canvasWidth / 2 + this.origin.x - canvasCenter.x
    this.origin.y = this.canvasHeight / 2 + this.origin.y - canvasCenter.y
    this._magnificationChangedCallback?.(this.magnification)
    this.requestUpdate()
    this._dispatchEvent('viewBoxChanged', 'set-view-box')
  }

  private _getProposedViewBoxMagnification(viewBox: Rect): number {
    const validated = validateRect(viewBox)
    const width = this.canvasWidth
    const height = this.canvasHeight

    const magnificationX = Math.abs(width / (validated.xMax - validated.xMin))
    const magnificationY = Math.abs(height / (validated.yMax - validated.yMin))
    return Math.min(magnificationX, magnificationY)
  }

  private _dispatchEvent(eventName: string, detail: ViewBoxChangeReason) {
    const event = new CustomEvent(eventName, {
      bubbles: false,
      detail,
    })
    this.canvas.dispatchEvent(event)
  }

  destroy() {
    this._resizeObserver?.disconnect()
    if (this._scrollTimerID) {
      clearTimeout(this._scrollTimerID)
    }
  }
}

// Utility functions

export function withSavedState<T>(
  context: CanvasRenderingContext2D,
  func: () => T
): T {
  context.save()
  try {
    return func()
  } finally {
    context.restore()
  }
}

function normalizeRect(rect: Rect): Rect {
  return {
    xMin: Math.min(rect.xMin, rect.xMax),
    yMin: Math.min(rect.yMin, rect.yMax),
    xMax: Math.max(rect.xMin, rect.xMax),
    yMax: Math.max(rect.yMin, rect.yMax),
  }
}

function validateRect(rect: Rect): Rect {
  if (
    !Number.isFinite(rect.xMin) ||
    !Number.isFinite(rect.yMin) ||
    !Number.isFinite(rect.xMax) ||
    !Number.isFinite(rect.yMax)
  ) {
    throw new Error('Invalid rect')
  }
  return rect
}

function rectCenter(rect: Rect): Point {
  return {
    x: (rect.xMin + rect.xMax) / 2,
    y: (rect.yMin + rect.yMax) / 2,
  }
}
