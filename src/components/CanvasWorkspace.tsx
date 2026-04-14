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

  // Debug logging
  console.log('CanvasWorkspace component initialized')

  // Store data
  const fontData = useStore((state) => state.fontData)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const selectedNodeIds = useStore((state) => state.selectedNodeIds)
  const viewport = useStore((state) => state.viewport)
  const setSelectedNodeIds = useStore((state) => state.setSelectedNodeIds)

  console.log('Store data:', {
    fontData: !!fontData,
    selectedGlyphId,
    selectedNodeIdsCount: selectedNodeIds.length,
    viewport,
  })

  // Zundo temporal hooks
  const pastStatesLength = useTemporalStore((state) => state.pastStates.length)
  const futureStatesLength = useTemporalStore(
    (state) => state.futureStates.length
  )

  const handleUndo = useCallback(() => {
    console.log('Undo clicked')
    useStore.temporal.getState().undo()
  }, [])

  const handleRedo = useCallback(() => {
    console.log('Redo clicked')
    useStore.temporal.getState().redo()
  }, [])

  // Convert current glyph data to Fontra format
  const getPositionedGlyph = useCallback((): PositionedGlyph | undefined => {
    console.log('getPositionedGlyph called', {
      fontData: !!fontData,
      selectedGlyphId,
    })
    if (!fontData || !selectedGlyphId) {
      console.log('Missing fontData or selectedGlyphId')
      return undefined
    }

    const glyph = fontData.glyphs[selectedGlyphId]
    console.log('Found glyph:', {
      glyphId: selectedGlyphId,
      hasPaths: !!glyph.paths,
      pathsCount: glyph.paths?.length,
    })
    if (!glyph) return undefined

    // Convert paths to VarPackedPath
    const contours: {
      points: {
        x: number
        y: number
        type: 'onCurve' | 'offCurveCubic'
        smooth?: boolean
      }[]
      isClosed: boolean
    }[] = []

    for (const pathData of glyph.paths) {
      const points = pathData.nodes.map((node) => ({
        x: node.x,
        y: node.y,
        type: (node.type === 'smooth' ? 'onCurve' : 'onCurve') as
          | 'onCurve'
          | 'offCurveCubic',
        smooth: node.type === 'smooth',
      }))

      contours.push({
        points,
        isClosed: pathData.closed,
      })
    }

    const varPath = VarPackedPath.fromUnpackedContours(contours)
    console.log('Created VarPackedPath', {
      contoursCount: contours.length,
      pointsPerContour: contours.map((c) => c.points.length),
    })

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
      x: 0,
      y: 0,
      isEditing: true,
      isEmpty: glyph.paths.length === 0,
    }
  }, [fontData, selectedGlyphId])

  // Initialize canvas
  useEffect(() => {
    console.log('Canvas initialization effect running')
    if (!canvasRef.current) {
      console.log('No canvas ref yet')
      return
    }
    if (canvasControllerRef.current) {
      console.log('Canvas controller already exists')
      return
    }

    const canvas = canvasRef.current
    console.log('Canvas element:', canvas)

    // Create canvas controller
    const controller = new CanvasController(canvas)
    console.log('CanvasController created')

    canvasControllerRef.current = controller

    // Create scene view with all registered layers
    const layers = visualizationLayerDefinitions.map(
      (def) => new VisualizationLayer(def)
    )
    console.log('Created layers:', layers.length)
    const sceneView = new SceneView(layers)
    sceneViewRef.current = sceneView
    controller.sceneView = sceneView
    console.log('SceneView created and attached')

    // Create scene model FIRST so we can set it on controller before initial draw
    const sceneModel: SceneModel = {
      glyph: undefined,
      selection: new Set(),
      hoverSelection: new Set(),
      canEdit: true,
    }
    console.log('SceneModel created')

    // Set the sceneModel on controller immediately
    controller.sceneModel = sceneModel

    // Create scene controller
    const sceneController = new SceneController({
      canvasController: controller,
      model: sceneModel,
      onSelectionChange: (selection) => {
        console.log('Selection changed:', selection)
        const nodeIds: string[] = []
        for (const item of selection) {
          const match = item.match(/^point\/(\d+)$/)
          if (match) {
            const pathIndex = 0 // Simplified for now
            const nodeIndex = parseInt(match[1], 10)
            nodeIds.push(`${pathIndex}:${nodeIndex}`)
          }
        }
        setSelectedNodeIds(nodeIds)
      },
      onUpdateNodePosition: (glyphId, pathId, nodeId, newPos) => {
        console.log('Updating node position via callback:', { glyphId, pathId, nodeId, newPos })
        useStore.getState().updateNodePosition(glyphId, pathId, nodeId, newPos)
      }
    })

    sceneControllerRef.current = sceneController
    console.log('SceneController created')

    // Initial draw
    console.log('Calling initial draw')
    controller.draw()

    return () => {
      console.log('Cleaning up canvas')
      controller.destroy()
      canvasControllerRef.current = null
      sceneControllerRef.current = null
      sceneViewRef.current = null
    }
  }, [setSelectedNodeIds])

  // Update scene model when data changes
  useEffect(() => {
    console.log('Update scene model effect running', {
      fontData: !!fontData,
      selectedGlyphId,
      selectedNodeIdsLength: selectedNodeIds.length,
    })
    const sceneView = sceneViewRef.current
    const sceneController = sceneControllerRef.current
    if (!sceneView || !sceneController) {
      console.log('Missing sceneView or sceneController', {
        sceneView: !!sceneView,
        sceneController: !!sceneController,
      })
      return
    }

    const positionedGlyph = getPositionedGlyph()
    console.log('Positioned glyph from getPositionedGlyph:', {
      positionedGlyph: !!positionedGlyph,
    })

    // Update scene model
    console.log('Setting sceneModel glyph:', { glyph: positionedGlyph ? { xAdvance: positionedGlyph.glyph.xAdvance } : null })
    sceneController.sceneModel.glyph = positionedGlyph
    sceneController.sceneModel.selection = new Set(
      selectedNodeIds.map((id) => {
        const [, nodeIndex] = id.split(':')
        return `point/${nodeIndex}`
      })
    )
    console.log('Updated scene model glyph and selection, now has glyph:', !!sceneController.sceneModel.glyph)

    // Update viewport
    const controller = canvasControllerRef.current
    if (controller) {
      console.log('Updating viewport', {
        viewport,
        canvasWidth: controller.canvasWidth,
        canvasHeight: controller.canvasHeight,
      })
      controller.origin.x = controller.canvasWidth / 2 + viewport.pan.x
      controller.origin.y = controller.canvasHeight / 2 + viewport.pan.y
      controller.magnification = viewport.zoom
      console.log('Updated controller origin and magnification', {
        origin: controller.origin,
        magnification: controller.magnification,
      })
    }

    // Request redraw
    console.log('Requesting update')
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
