// 格線圖層 - 從 Fontra 移植

import {
  registerVisualizationLayerDefinition,
  glyphSelector,
} from '../SceneView'
import type { CanvasController } from '../CanvasController'
import type { PositionedGlyph, SceneModel } from '../SceneView'

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

// UPM 格點 (每單位一個點)
registerVisualizationLayerDefinition({
  identifier: 'fontra.upm.grid',
  name: 'UPM Grid',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 0,
  screenParameters: { dotSize: 0.12 },
  colors: { fillColor: '#0003' },
  colorsDarkMode: { fillColor: '#FFF3' },
  draw: (canvasController: CanvasController, _positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, _model: SceneModel, controller: CanvasController) => {
    if (controller.magnification < 24) {
      return
    }

    const context = canvasController.context
    context.fillStyle = parameters.fillColor as string

    const { xMin, yMin, xMax, yMax } = controller.getViewBox()
    const dotSize = parameters.dotSize as number

    for (let x = Math.floor(xMin); x < Math.ceil(xMax); x++) {
      for (let y = Math.floor(yMin); y < Math.ceil(yMax); y++) {
        context.beginPath()
        context.arc(x, y, dotSize / 2, 0, Math.PI * 2)
        context.fill()
      }
    }
  },
})

// 主要格線 (每 100 單位)
registerVisualizationLayerDefinition({
  identifier: 'fontra.major.grid',
  name: 'Major Grid',
  selectionFunc: glyphSelector('editing'),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 1,
  screenParameters: { strokeWidth: 1, gridStep: 100 },
  colors: { strokeColor: '#0002' },
  colorsDarkMode: { strokeColor: '#FFF2' },
  draw: (canvasController: CanvasController, _positionedGlyph: PositionedGlyph, parameters: Record<string, number | number[] | string>, _model: SceneModel, controller: CanvasController) => {
    if (controller.magnification < 10) {
      return
    }

    const context = canvasController.context
    context.strokeStyle = parameters.strokeColor as string
    context.lineWidth = parameters.strokeWidth as number

    const { xMin, yMin, xMax, yMax } = controller.getViewBox()
    const gridStep = parameters.gridStep as number

    // Draw vertical lines
    for (let x = Math.floor(xMin / gridStep) * gridStep; x < Math.ceil(xMax); x += gridStep) {
      strokeLine(context, x, yMin, x, yMax)
    }

    // Draw horizontal lines
    for (let y = Math.floor(yMin / gridStep) * gridStep; y < Math.ceil(yMax); y += gridStep) {
      strokeLine(context, xMin, y, xMax, y)
    }
  },
})
