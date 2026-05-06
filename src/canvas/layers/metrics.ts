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
  identifier: 'main.baseline',
  name: 'Baseline',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 100,
  screenParameters: { strokeWidth: 1 },
  colors: { strokeColor: '#d1a986' },
  colorsDarkMode: { strokeColor: '#FFF' },
  draw: (
    canvasController: CanvasController,
    positionedGlyph: PositionedGlyph,
    parameters: Record<string, number | number[] | string>
  ) => {
    const context = canvasController.context
    context.strokeStyle = parameters.strokeColor as string
    context.lineWidth = parameters.strokeWidth as number

    const glyph = positionedGlyph.glyph
    strokeLine(context, 0, 0, glyph.xAdvance, 0)
  },
})

// 進階字體度量線
registerVisualizationLayerDefinition({
  identifier: 'main.lineMetrics',
  name: 'Line Metrics',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 100,
  screenParameters: { strokeWidth: 1 },
  colors: {
    strokeColor: '#252B2E5C',
    zoneColor: '#25DAF214',
    zoneStrokeColor: '#00AFC92E',
  },
  colorsDarkMode: {
    strokeColor: '#FFF6',
    zoneColor: '#00BFFF18',
    zoneStrokeColor: '#80DFFF18',
  },
  draw: (
    canvasController: CanvasController,
    positionedGlyph: PositionedGlyph,
    parameters: Record<string, number | number[] | string>,
    model: SceneModel
  ) => {
    const context = canvasController.context
    context.lineWidth = parameters.strokeWidth as number

    const lineMetrics = model.lineMetricsHorizontalLayout
    if (!lineMetrics) {
      return
    }

    const glyphWidth = positionedGlyph.glyph.xAdvance || 0
    const pathBox = new Path2D()
    if (lineMetrics.ascender && lineMetrics.descender) {
      pathBox.rect(
        0,
        lineMetrics.descender.value,
        glyphWidth,
        lineMetrics.ascender.value - lineMetrics.descender.value
      )
    }

    const zoneFillPaths: Path2D[] = []
    const zoneEndStrokes = new Path2D()
    for (const metric of Object.values(lineMetrics)) {
      if (metric.zone) {
        const pathZone = new Path2D()
        pathZone.rect(0, metric.value, glyphWidth, metric.zone)
        zoneFillPaths.push(pathZone)

        const zoneY = metric.value + metric.zone
        zoneEndStrokes.moveTo(0, zoneY)
        zoneEndStrokes.lineTo(glyphWidth, zoneY)
      }

      const pathMetric = new Path2D()
      pathMetric.moveTo(0, metric.value)
      pathMetric.lineTo(glyphWidth, metric.value)
      pathBox.addPath(pathMetric)
    }

    context.fillStyle = parameters.zoneColor as string
    zoneFillPaths.forEach((zonePath) => context.fill(zonePath))

    context.strokeStyle = parameters.zoneStrokeColor as string
    context.stroke(zoneEndStrokes)

    context.strokeStyle = parameters.strokeColor as string
    context.stroke(pathBox)
  },
})

// 度量線 (左側邊緣、寬度)
registerVisualizationLayerDefinition({
  identifier: 'main.metrics',
  name: 'Glyph Metrics',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 100,
  screenParameters: { strokeWidth: 1.2, dashArray: [12, 10] },
  colors: {
    lsbColor: '#F7EB40',
    widthColor: '#25DAF2',
  },
  draw: (
    canvasController: CanvasController,
    positionedGlyph: PositionedGlyph,
    parameters: Record<string, number | number[] | string>
  ) => {
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
