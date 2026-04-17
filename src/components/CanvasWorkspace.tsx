// 新的 CanvasWorkspace - 使用 Fontra 架構

import { useEffect, useRef, useCallback } from 'react'
import { Box, Flex, Button, Text, HStack } from '@chakra-ui/react'
import {
  CanvasController,
  SceneView,
  VisualizationLayer,
  visualizationLayerDefinitions,
  type PositionedGlyph,
  type GlyphData,
  type SceneModel,
} from '../canvas'
import { SceneController } from '../tools'
import { VarPackedPath } from '../font/VarPackedPath'
import { useStore, useTemporalStore } from '../store'

// const GRID_STEP = 120; // Not currently used but kept for future implementation

export function CanvasWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasControllerRef = useRef<CanvasController | null>(null)
  const sceneControllerRef = useRef<SceneController | null>(null)
  const sceneViewRef = useRef<SceneView | null>(null)
  const availableTools = [
    { id: 'pointer', label: 'Pointer', status: 'ready' },
    { id: 'pen', label: 'Pen', status: 'partial' },
  ] as const

  // Store data
  const fontData = useStore((state) => state.fontData)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const selectedNodeIds = useStore((state) => state.selectedNodeIds)
  const viewport = useStore((state) => state.viewport)
  const setSelectedNodeIds = useStore((state) => state.setSelectedNodeIds)
  const updateViewport = useStore((state) => state.updateViewport)

  // Zundo temporal hooks
  const pastStatesLength = useTemporalStore((state) => state.pastStates.length)
  const futureStatesLength = useTemporalStore(
    (state) => state.futureStates.length
  )

  const handleUndo = useCallback(() => {
    useStore.temporal.getState().undo()
  }, [])

  const handleRedo = useCallback(() => {
    useStore.temporal.getState().redo()
  }, [])

  const buildPointRefs = useCallback(() => {
    if (!fontData || !selectedGlyphId) {
      return []
    }

    const glyph = fontData.glyphs[selectedGlyphId]
    if (!glyph) {
      return []
    }

    return glyph.paths.flatMap((path) =>
      path.nodes.map((node) => ({
        pathId: path.id,
        nodeId: node.id,
      }))
    )
  }, [fontData, selectedGlyphId])

  // Convert current glyph data to Fontra format
  const getPositionedGlyph = useCallback((): PositionedGlyph | undefined => {
    if (!fontData || !selectedGlyphId) {
      console.log('Missing fontData or selectedGlyphId')
      return undefined
    }
    const glyph = fontData.glyphs[selectedGlyphId]
    if (!glyph) return undefined
    const pointRefs = buildPointRefs()

    // Convert paths to VarPackedPath
    const contours: {
      points: {
        x: number
        y: number
        type: 'onCurve' | 'offCurveQuad' | 'offCurveCubic'
        smooth?: boolean
      }[]
      isClosed: boolean
    }[] = []

    for (const pathData of glyph.paths) {
      const points = pathData.nodes.map((node) => ({
        x: node.x,
        y: node.y,
        type: (node.type === 'offcurve'
          ? 'offCurveCubic'
          : node.type === 'qcurve'
            ? 'offCurveQuad'
            : 'onCurve') as 'onCurve' | 'offCurveQuad' | 'offCurveCubic',
        smooth: node.type === 'smooth',
      }))

      contours.push({
        points,
        isClosed: pathData.closed,
      })
    }

    const varPath = VarPackedPath.fromUnpackedContours(contours)

    const glyphData: GlyphData = {
      path: varPath,
      xAdvance: glyph.metrics.width,
      components: [],
      guidelines: [],
      flattenedPath2d: undefined,
      closedContoursPath2d: undefined,
    }

    return {
      glyph: glyphData,
      glyphId: glyph.id,
      x: 0,
      y: 0,
      pointRefs,
      isEditing: true,
      isEmpty: glyph.paths.length === 0,
    }
  }, [buildPointRefs, fontData, selectedGlyphId])

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) {
      console.log('No canvas ref yet')
      return
    }
    if (canvasControllerRef.current) {
      console.log('Canvas controller already exists')
      return
    }

    const canvas = canvasRef.current

    // Create canvas controller
    const controller = new CanvasController(canvas)

    canvasControllerRef.current = controller

    // Create scene view with all registered layers
    const layers = visualizationLayerDefinitions.map(
      (def) => new VisualizationLayer(def)
    )
    const sceneView = new SceneView(layers)
    sceneViewRef.current = sceneView
    controller.sceneView = sceneView

    // Create scene model FIRST so we can set it on controller before initial draw
    const sceneModel: SceneModel = {
      glyph: undefined,
      selection: new Set(),
      hoverSelection: new Set(),
      canEdit: true,
    }

    // Set the sceneModel on controller immediately
    controller.sceneModel = sceneModel

    // Create scene controller
    const sceneController = new SceneController({
      canvasController: controller,
      model: sceneModel,
      onSelectionChange: (selection) => {
        const pointRefs = sceneController.sceneModel.glyph?.pointRefs ?? []
        const nodeIds: string[] = []
        for (const item of selection) {
          const match = item.match(/^point\/(\d+)$/)
          if (match) {
            const nodeIndex = parseInt(match[1], 10)
            const pointRef = pointRefs[nodeIndex]
            if (pointRef) {
              nodeIds.push(`${pointRef.pathId}:${pointRef.nodeId}`)
            }
          }
        }
        setSelectedNodeIds(nodeIds)
      },
      onUpdateNodePosition: (glyphId, pathId, nodeId, newPos) => {
        useStore.getState().updateNodePosition(glyphId, pathId, nodeId, newPos)
      },
      onCommitNodePositions: (glyphId, updates) => {
        useStore.getState().updateNodePositions(glyphId, updates)
      },
      onUpdateNodeType: (glyphId, pathId, nodeId, type) => {
        useStore.getState().updateNodeType(glyphId, pathId, nodeId, type)
      },
    })

    sceneControllerRef.current = sceneController

    const syncViewportFromCanvas = () => {
      updateViewport(
        controller.magnification,
        controller.origin.x - controller.canvasWidth / 2,
        controller.origin.y - controller.canvasHeight / 2
      )
    }

    canvas.addEventListener('viewBoxChanged', syncViewportFromCanvas)

    // Initial draw
    controller.draw()

    return () => {
      canvas.removeEventListener('viewBoxChanged', syncViewportFromCanvas)
      controller.destroy()
      canvasControllerRef.current = null
      sceneControllerRef.current = null
      sceneViewRef.current = null
    }
  }, [setSelectedNodeIds, updateViewport])

  // Update scene model when data changes
  useEffect(() => {
    const sceneView = sceneViewRef.current
    const sceneController = sceneControllerRef.current
    if (!sceneView || !sceneController) {
      return
    }

    const positionedGlyph = getPositionedGlyph()

    // Update scene model
    sceneController.sceneModel.glyph = positionedGlyph
    sceneController.sceneModel.lineMetricsHorizontalLayout =
      fontData?.lineMetricsHorizontalLayout
    sceneController.sceneModel.selection = new Set(
      selectedNodeIds.map((id) => {
        const [, nodeIndex] = id.split(':')
        return `point/${nodeIndex}`
      })
    )

    // Update viewport
    const controller = canvasControllerRef.current
    if (controller) {
      controller.origin.x = controller.canvasWidth / 2 + viewport.pan.x
      controller.origin.y = controller.canvasHeight / 2 + viewport.pan.y
      controller.magnification = viewport.zoom
    }

    // Request redraw
    controller?.requestUpdate()
  }, [fontData, selectedGlyphId, selectedNodeIds, viewport, getPositionedGlyph])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          handleUndo()
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault()
          handleRedo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    <Box position="relative" w="100%" h="100%" bg="white" overflow="hidden">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
        }}
      />

      {/* UI Overlay */}
      <Flex
        position="absolute"
        top={4}
        left={4}
        direction="column"
        gap={1}
        px={3}
        py={2}
        borderRadius="lg"
        bg="rgba(15, 23, 42, 0.78)"
        border="1px solid rgba(148, 163, 184, 0.22)"
        backdropFilter="blur(10px)"
      >
        <Text fontSize="xs" color="whiteAlpha.800">
          Fontra Canvas Workspace
        </Text>
        <Text fontSize="xs" color="whiteAlpha.700">
          滾輪縮放，拖曳空白區平移視角
        </Text>
        <Text fontSize="xs" color="whiteAlpha.700">
          點擊節點選取，拖曳移動
        </Text>

        <HStack mt={2}>
          <Button
            size="xs"
            colorScheme="teal"
            variant="solid"
            onClick={handleUndo}
            isDisabled={pastStatesLength === 0}
          >
            ↩ Undo (⌘Z)
          </Button>
          <Button
            size="xs"
            colorScheme="teal"
            variant="solid"
            onClick={handleRedo}
            isDisabled={futureStatesLength === 0}
          >
            ↪ Redo (⇧⌘Z)
          </Button>
        </HStack>

        <HStack mt={2} spacing={2} align="center">
          {availableTools.map((tool) => (
            <Box
              key={tool.id}
              px={2}
              py={1}
              borderRadius="md"
              bg={tool.status === 'ready' ? 'whiteAlpha.200' : 'orange.300'}
              color={tool.status === 'ready' ? 'whiteAlpha.900' : 'black'}
              fontSize="xs"
            >
              {tool.label} {tool.status === 'partial' ? '(partial)' : ''}
            </Box>
          ))}
        </HStack>
      </Flex>

      {/* Shortcuts legend */}
      <Flex
        position="absolute"
        right={4}
        bottom={4}
        align="center"
        gap={2}
        px={3}
        py={2}
        borderRadius="lg"
        bg="rgba(15, 23, 42, 0.72)"
        color="whiteAlpha.800"
        fontSize="xs"
      >
        <Box as="span" bg="whiteAlpha.200" px={1} borderRadius="sm">
          Wheel
        </Box>
        <Text>Zoom</Text>
        <Box as="span" bg="whiteAlpha.200" px={1} borderRadius="sm">
          Drag
        </Box>
        <Text>Pan / Move Node</Text>
      </Flex>
    </Box>
  )
}
