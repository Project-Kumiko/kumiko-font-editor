// SceneView 與 Visualization Layers 架構
// 從 Fontra 移植

import type { CanvasController } from './CanvasController'

export interface SceneModel {
  glyph?: PositionedGlyph
  lineMetricsHorizontalLayout?: Record<
    string,
    {
      value: number
      zone?: number
    }
  >
  selection?: Set<string>
  hoverSelection?: Set<string>
  selectionRect?: {
    xMin: number
    yMin: number
    xMax: number
    yMax: number
    owner?: 'pointer'
  }
  hoverPathHit?: PathHitInfo
  selectedPathHit?: PathHitInfo
  activeToolIdentifier?: string
  initialClickedPointIndex?: number
  canEdit?: boolean
}

export interface PathHitInfo {
  segment: {
    points: { x: number; y: number }[]
    pointIndices: number[]
    type?: 'line' | 'quad' | 'cubic' | 'quadBlob'
    contourIndex?: number
    key?: string
  }
  x: number
  y: number
}

export interface PositionedGlyph {
  glyph: GlyphData
  glyphId?: string
  x: number
  y: number
  pointRefs?: Array<{ pathId: string; nodeId: string }>
  isEditing?: boolean
  isEmpty?: boolean
  isHovered?: boolean
  isSelected?: boolean
}

export interface GlyphData {
  path: {
    iterPoints(): Generator<Point & { index: number }, void>
    iterHandles(): Generator<[Point, Point], void>
    iterContours(): Generator<{ points: Point[]; isClosed: boolean }, void>
    iterContourSegments?(
      contourIndex: number
    ): Generator<{
      points: Point[]
      pointIndices: number[]
      type?: 'line' | 'quad' | 'cubic' | 'quadBlob'
    }, void>
    appendUnpackedContour?(contour: {
      points: Point[]
      isClosed: boolean
    }): void
    setPoint?(index: number, point: Point): void
    getPoint?(index: number): Point
    contourToPath2D?(contourIndex: number): Path2D
    contourInfo?: Array<{ endPoint: number; isClosed?: boolean }>
    pointTypes?: Uint8Array
    coordinates?: Float64Array
    toPath2D(): Path2D
    getControlBounds():
      | { xMin: number; yMin: number; xMax: number; yMax: number }
      | undefined
    numContours: number
  }
  components?: ComponentData[]
  guidelines?: GuidelineData[]
  xAdvance: number
  flattenedPath2d?: Path2D
  closedContoursPath2d?: Path2D
  componentsPath?: {
    iterPoints(): Generator<Point, void>
    iterHandles(): Generator<[Point, Point], void>
  }
}

export interface Point {
  x: number
  y: number
  type?: 'onCurve' | 'offCurveQuad' | 'offCurveCubic'
  smooth?: boolean
}

export interface ComponentData {
  name: string
  transformation: {
    translateX: number
    translateY: number
  }
}

export interface GuidelineData {
  x: number
  y: number
  angle: number
  locked?: boolean
}

export interface VisualizationLayerDefinition {
  identifier: string
  name: string
  selectionFunc: (
    visContext: VisContext,
    layer: VisualizationLayerDefinition
  ) => PositionedGlyph[]
  userSwitchable?: boolean
  defaultOn?: boolean
  zIndex: number
  screenParameters?: Record<string, number | number[]>
  colors: Record<string, string>
  colorsDarkMode?: Record<string, string>
  draw: (
    canvasController: CanvasController,
    positionedGlyph: PositionedGlyph,
    parameters: Record<string, number | number[] | string>,
    model: SceneModel,
    controller: CanvasController
  ) => void
}

export interface VisContext {
  glyphsBySelectionMode: Record<string, PositionedGlyph[]>
}

export class SceneView {
  layers: VisualizationLayer[] = []
  model: SceneModel = {}

  constructor(layers: VisualizationLayer[] = []) {
    this.layers = layers.filter((l) => l.visible)
  }

  draw(canvasController: CanvasController, model: SceneModel) {
    // Sort layers by zIndex
    const sortedLayers = [...this.layers].sort(
      (a, b) => a.definition.zIndex - b.definition.zIndex
    )

    for (const _layer of sortedLayers) {
      _layer.draw(canvasController, model)
    }
  }

  addLayer(layer: VisualizationLayer) {
    this.layers.push(layer)
    this.layers.sort((a, b) => a.definition.zIndex - b.definition.zIndex)
  }

  removeLayer(identifier: string) {
    this.layers = this.layers.filter(
      (l) => l.definition.identifier !== identifier
    )
  }

  setLayerVisible(identifier: string, visible: boolean) {
    const layer = this.layers.find(
      (l) => l.definition.identifier === identifier
    )
    if (layer) {
      layer.visible = visible
    }
  }
}

export class VisualizationLayer {
  definition: VisualizationLayerDefinition
  visible: boolean
  private _colors: Record<string, string>

  constructor(definition: VisualizationLayerDefinition) {
    this.definition = definition
    this.visible = definition.defaultOn !== false
    this._colors = definition.colors
  }

  draw(canvasController: CanvasController, model: SceneModel) {
    if (!this.visible || !model.glyph) {
      return
    }

    // Build parameters
    const parameters: Record<string, number | number[] | string> = {
      ...this.definition.screenParameters,
      ...this._colors,
    }

    // Get glyphs to render
    const visContext: VisContext = {
      glyphsBySelectionMode: {
        editing: model.glyph?.isEditing ? [model.glyph] : [],
        selected: model.glyph?.isSelected ? [model.glyph] : [],
        hovered: model.glyph?.isHovered ? [model.glyph] : [],
        all: model.glyph ? [model.glyph] : [],
        unselected: model.glyph && !model.glyph.isEditing ? [model.glyph] : [],
        notediting: model.glyph && !model.glyph.isEditing ? [model.glyph] : [],
      },
    }

    const glyphs = this.definition.selectionFunc(visContext, this.definition)

    // Draw each glyph
    for (const glyph of glyphs) {
      if (glyph) {
        this.definition.draw(
          canvasController,
          glyph,
          parameters,
          model,
          canvasController
        )
      }
    }
  }
}

// Layer registry
export const visualizationLayerDefinitions: VisualizationLayerDefinition[] = []

export function registerVisualizationLayerDefinition(
  layerDef: VisualizationLayerDefinition
) {
  // Find insertion point based on zIndex
  let index = 0
  for (index = 0; index < visualizationLayerDefinitions.length; index++) {
    if (layerDef.zIndex < visualizationLayerDefinitions[index].zIndex) {
      break
    }
  }
  visualizationLayerDefinitions.splice(index, 0, layerDef)
}

export function glyphSelector(selectionMode: string) {
  return (visContext: VisContext, _layer: VisualizationLayerDefinition) => {
    const glyphs = visContext.glyphsBySelectionMode[selectionMode] || []
    return glyphs
  }
}
