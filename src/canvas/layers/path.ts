// 路徑和節點繪製圖層

import {
  registerVisualizationLayerDefinition,
  glyphSelector,
} from '../SceneView'
import type { Point } from '../SceneView'

function strokeLine(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  context.beginPath()
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
  context.stroke()
}

// 編輯路徑填充
registerVisualizationLayerDefinition({
  identifier: 'fontra.edit.path.fill',
  name: 'Path Fill',
  selectionFunc: glyphSelector('editing'),
  zIndex: 500,
  screenParameters: { strokeWidth: 1 },
  colors: { fillColor: '#0001' },
  colorsDarkMode: { fillColor: '#FFF3' },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, model: SceneModel, controller: CanvasController) => {
    const context = canvasController.context
    const glyph = positionedGlyph.glyph
    if (!glyph.path) return

    context.fillStyle = parameters.fillColor as string
    context.fill(glyph.path.toPath2D())
  },
})

// 路徑輪廓
registerVisualizationLayerDefinition({
  identifier: 'fontra.path.stroke',
  name: 'Path Stroke',
  selectionFunc: glyphSelector('editing'),
  zIndex: 500,
  screenParameters: { strokeWidth: 2 },
  colors: { strokeColor: '#000' },
  colorsDarkMode: { strokeColor: '#FFF' },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, model: SceneModel, controller: CanvasController) => {
    const context = canvasController.context
    const glyph = positionedGlyph.glyph
    if (!glyph.path) return

    context.strokeStyle = parameters.strokeColor as string
    context.lineWidth = parameters.strokeWidth as number
    context.stroke(glyph.path.toPath2D())
  },
})

// 控制杆 (Bezier handles)
registerVisualizationLayerDefinition({
  identifier: 'fontra.handles',
  name: 'Bezier Handles',
  selectionFunc: glyphSelector('editing'),
  zIndex: 500,
  screenParameters: { strokeWidth: 1 },
  colors: { color: '#BBB' },
  colorsDarkMode: { color: '#777' },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, model: SceneModel, controller: CanvasController) => {
    const context = canvasController.context
    const glyph = positionedGlyph.glyph
    if (!glyph.path?.iterHandles) return

    context.strokeStyle = parameters.color as string
    context.lineWidth = parameters.strokeWidth as number

    for (const [pt1, pt2] of glyph.path.iterHandles()) {
      strokeLine(context, pt1.x, pt1.y, pt2.x, pt2.y)
    }
  },
})

// 節點
registerVisualizationLayerDefinition({
  identifier: 'fontra.nodes',
  name: 'Nodes',
  selectionFunc: glyphSelector('editing'),
  zIndex: 500,
  screenParameters: { cornerSize: 8, smoothSize: 8, handleSize: 6.5 },
  colors: { color: '#BBB' },
  colorsDarkMode: { color: '#BBB' },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, model: SceneModel, controller: CanvasController) => {
    const context = canvasController.context
    const glyph = positionedGlyph.glyph
    if (!glyph.path?.iterPoints) return

    const cornerSize = parameters.cornerSize as number
    const smoothSize = parameters.smoothSize as number
    const handleSize = parameters.handleSize as number

    context.fillStyle = parameters.color as string

    for (const pt of glyph.path.iterPoints()) {
      fillNode(context, pt, cornerSize, smoothSize, handleSize)
    }
  },
})

// 選中的節點
registerVisualizationLayerDefinition({
  identifier: 'fontra.selected.nodes',
  name: 'Selected Nodes',
  selectionFunc: glyphSelector('editing'),
  zIndex: 600,
  screenParameters: {
    cornerSize: 8,
    smoothSize: 8,
    handleSize: 6.5,
    strokeWidth: 1,
    hoverStrokeOffset: 4,
    underlayOffset: 2,
  },
  colors: {
    hoveredColor: '#BBB',
    selectedColor: '#000',
    underColor: '#FFFA',
  },
  colorsDarkMode: {
    hoveredColor: '#BBB',
    selectedColor: '#FFF',
    underColor: '#0008',
  },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, model: SceneModel, controller: CanvasController) => {
    const context = canvasController.context
    const glyph = positionedGlyph.glyph
    if (!glyph.path?.iterPoints) return

    const cornerSize = parameters.cornerSize as number
    const smoothSize = parameters.smoothSize as number
    const handleSize = parameters.handleSize as number
    const underlayOffset = parameters.underlayOffset as number

    const selectedPointIndices = parseSelection(model.selection || new Set())
    const hoveredPointIndices = parseSelection(model.hoverSelection || new Set())

    // Draw underlay (white background)
    context.fillStyle = parameters.underColor as string
    for (const idx of selectedPointIndices) {
      const pt = getPointByIndex(glyph.path, idx)
      if (pt) {
        fillNode(
          context,
          pt,
          cornerSize + underlayOffset,
          smoothSize + underlayOffset,
          handleSize + underlayOffset
        )
      }
    }

    // Draw selected nodes
    context.fillStyle = parameters.selectedColor as string
    for (const idx of selectedPointIndices) {
      const pt = getPointByIndex(glyph.path, idx)
      if (pt) {
        fillNode(context, pt, cornerSize, smoothSize, handleSize)
      }
    }

    // Draw hovered nodes
    context.fillStyle = parameters.hoveredColor as string
    for (const idx of hoveredPointIndices) {
      const pt = getPointByIndex(glyph.path, idx)
      if (pt) {
        fillNode(context, pt, cornerSize, smoothSize, handleSize)
      }
    }
  },
})

// 游標十字線
registerVisualizationLayerDefinition({
  identifier: 'fontra.crosshair',
  name: 'Crosshair',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 700,
  screenParameters: { strokeWidth: 1, lineDash: [4, 4] },
  colors: { strokeColor: '#8888' },
  colorsDarkMode: { strokeColor: '#AAA8' },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, model: SceneModel, controller: CanvasController) => {
    if (model.initialClickedPointIndex === undefined) return

    const glyph = positionedGlyph.glyph
    const pt = getPointByIndex(glyph.path, model.initialClickedPointIndex)
    if (!pt) return

    const context = canvasController.context
    context.strokeStyle = parameters.strokeColor as string
    context.lineWidth = parameters.strokeWidth as number
    context.setLineDash(parameters.lineDash as number[])

    const { xMin, yMin, xMax, yMax } = controller.getViewBox()

    strokeLine(context, pt.x, yMin, pt.x, yMax)
    strokeLine(context, xMin, pt.y, xMax, pt.y)

    context.setLineDash([])
  },
})

// Helper functions

function fillNode(
  context: CanvasRenderingContext2D,
  pt: Point,
  cornerSize: number,
  smoothSize: number,
  handleSize: number
) {
  const size = pt.type === 'onCurve' ? (pt.smooth ? smoothSize : cornerSize) : handleSize

  context.beginPath()

  if (pt.type === 'onCurve') {
    if (pt.smooth) {
      // Circle for smooth on-curve points
      context.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2)
    } else {
      // Square for corner on-curve points
      context.rect(pt.x - size / 2, pt.y - size / 2, size, size)
    }
  } else {
    // Diamond for off-curve points
    context.moveTo(pt.x, pt.y - size / 2)
    context.lineTo(pt.x + size / 2, pt.y)
    context.lineTo(pt.x, pt.y + size / 2)
    context.lineTo(pt.x - size / 2, pt.y)
    context.closePath()
  }

  context.fill()
}

function parseSelection(selection: Set<string>): number[] {
  const indices: number[] = []
  for (const item of selection) {
    const match = item.match(/^point\/(\d+)$/)
    if (match) {
      indices.push(parseInt(match[1], 10))
    }
  }
  return indices
}

function getPointByIndex(
  path: { iterPoints(): Generator<Point & { index: number }, void> },
  index: number
): Point | null {
  for (const pt of path.iterPoints()) {
    if (pt.index === index) {
      return pt
    }
  }
  return null
}
