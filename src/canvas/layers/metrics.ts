// 基線和字體度量圖層

import {
  registerVisualizationLayerDefinition,
  glyphSelector,
} from '../SceneView'
import type { PositionedGlyph, SceneModel } from '../SceneView'
import type { CanvasController } from '../CanvasController'

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

// 基線
registerVisualizationLayerDefinition({
  identifier: 'fontra.baseline',
  name: 'Baseline',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 100,
  screenParameters: { strokeWidth: 2 },
  colors: { strokeColor: '#000' },
  colorsDarkMode: { strokeColor: '#FFF' },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, _model: SceneModel, _controller: CanvasController) => {
    const context = canvasController.context
    context.strokeStyle = parameters.strokeColor as string
    context.lineWidth = parameters.strokeWidth as number

    const glyph = positionedGlyph.glyph
    strokeLine(context, 0, 0, glyph.xAdvance, 0)
  },
})

// 進階字體度量線
registerVisualizationLayerDefinition({
  identifier: 'fontra.lineMetrics',
  name: 'Line Metrics',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 100,
  screenParameters: { strokeWidth: 1 },
  colors: {
    strokeColor: '#0004',
    zoneColor: '#00BFFF18',
    zoneStrokeColor: '#00608018',
  },
  colorsDarkMode: {
    strokeColor: '#FFF6',
    zoneColor: '#00BFFF18',
    zoneStrokeColor: '#80DFFF18',
  },
  draw: (canvasController: CanvasController, _positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, _model: SceneModel, _controller: CanvasController) => {
    const context = canvasController.context
    context.lineWidth = parameters.strokeWidth as number

    // Default line metrics if not provided
    const ascender = 800
    const descender = -200
    const xAdvance = 500 // placeholder

    // Draw glyph box
    const pathBox = new Path2D()
    pathBox.rect(0, descender, xAdvance, ascender - descender)

    context.strokeStyle = parameters.strokeColor as string
    context.stroke(pathBox)

    // Draw metrics lines
    const metricsLines = [
      { y: ascender, label: 'ascender' },
      { y: descender, label: 'descender' },
      { y: 0, label: 'baseline' },
      { y: 700, label: 'cap height' },
      { y: 500, label: 'x-height' },
    ]

    for (const metric of metricsLines) {
      strokeLine(context, 0, metric.y, xAdvance, metric.y)
    }
  },
})

// 度量線 (左側邊緣、寬度)
registerVisualizationLayerDefinition({
  identifier: 'fontra.metrics',
  name: 'Glyph Metrics',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 100,
  screenParameters: { strokeWidth: 1.2, dashArray: [12, 10] },
  colors: {
    lsbColor: '#f6ad55',
    widthColor: '#68d391',
  },
  draw: (canvasController: CanvasController, positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, _model: SceneModel) => {
    const glyph = positionedGlyph.glyph
    const context = canvasController.context
    context.lineWidth = parameters.strokeWidth as number
    context.setLineDash(parameters.dashArray as number[])

    // Draw LSB line at 0
    context.strokeStyle = parameters.lsbColor as string
    strokeLine(context, 0, -980, 0, 980)

    // Draw width line at xAdvance
    context.strokeStyle = parameters.widthColor as string
    strokeLine(context, glyph.xAdvance, -980, glyph.xAdvance, 980)

    context.setLineDash([])
  },
})
