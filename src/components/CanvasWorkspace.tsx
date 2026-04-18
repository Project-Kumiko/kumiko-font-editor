// 新的 CanvasWorkspace - 使用 Fontra 架構

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
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
import { getEffectiveNodeType, getGlyphLayer, useStore, useTemporalStore } from '../store'
import {
  buildClipboardPayloadFromSelection,
  materializeClipboardPaths,
  parseClipboardPathsText,
  serializeClipboardPaths,
} from '../utils/clipboardPaths'

// const GRID_STEP = 120; // Not currently used but kept for future implementation

export function CanvasWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasControllerRef = useRef<CanvasController | null>(null)
  const sceneControllerRef = useRef<SceneController | null>(null)
  const sceneViewRef = useRef<SceneView | null>(null)
  const layerGeometryCacheRef = useRef(
    new Map<
      string,
      {
        layerRef: object
        pointRefs: Array<{ pathId: string; nodeId: string }>
        varPath: InstanceType<typeof VarPackedPath>
        components: NonNullable<GlyphData['components']>
        guidelines: NonNullable<GlyphData['guidelines']>
      }
    >()
  )
  const temporaryToolRef = useRef<'pointer' | 'pen' | 'brush' | 'hand' | null>(null)
  const [activeToolId, setActiveToolId] = useState<'pointer' | 'pen' | 'brush' | 'hand'>('pointer')
  const availableTools = [
    { id: 'pointer', label: 'Pointer', status: 'ready' },
    { id: 'pen', label: 'Pen', status: 'ready' },
    { id: 'brush', label: 'Brush', status: 'ready' },
    { id: 'hand', label: 'Hand', status: 'ready' },
  ] as const

  // Store data
  const fontData = useStore((state) => state.fontData)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const selectedLayerId = useStore((state) => state.selectedLayerId)
  const selectedNodeIds = useStore((state) => state.selectedNodeIds)
  const selectedSegment = useStore((state) => state.selectedSegment)
  const viewport = useStore((state) => state.viewport)
  const setSelectedNodeIds = useStore((state) => state.setSelectedNodeIds)
  const setSelectedSegment = useStore((state) => state.setSelectedSegment)
  const updateViewport = useStore((state) => state.updateViewport)
  const deleteSelectedNodes = useStore((state) => state.deleteSelectedNodes)

  const getPreviousPenSelection = useCallback(() => {
    if (
      activeToolId !== 'pen' ||
      !fontData ||
      !selectedGlyphId ||
      selectedNodeIds.length !== 1
    ) {
      return null
    }

    const [pathId, nodeId] = selectedNodeIds[0].split(':')
    const path = fontData.glyphs[selectedGlyphId]?.paths.find((candidate) => candidate.id === pathId)
    if (!path) {
      return null
    }

    const currentIndex = path.nodes.findIndex((node) => node.id === nodeId)
    if (currentIndex <= 0) {
      return null
    }

    return `${pathId}:${path.nodes[currentIndex - 1].id}`
  }, [activeToolId, fontData, selectedGlyphId, selectedNodeIds])

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

  const handleCopySelection = useCallback(async () => {
    if (!fontData || !selectedGlyphId) {
      return
    }

    const glyph = fontData.glyphs[selectedGlyphId]
    if (!glyph) {
      return
    }

    const payload = buildClipboardPayloadFromSelection(
      glyph,
      selectedNodeIds,
      selectedSegment
    )
    if (!payload) {
      return
    }

    await navigator.clipboard.writeText(serializeClipboardPaths(payload))
  }, [fontData, selectedGlyphId, selectedNodeIds, selectedSegment])

  const handlePasteSelection = useCallback(async () => {
    if (!selectedGlyphId) {
      return
    }

    const clipboardText = await navigator.clipboard.readText()
    const payload = parseClipboardPathsText(clipboardText)
    if (!payload) {
      return
    }

    const paths = materializeClipboardPaths(payload)
    if (!paths.length) {
      return
    }

    const store = useStore.getState()
    for (const path of paths) {
      store.createPath(selectedGlyphId, path)
    }

    setSelectedNodeIds(
      paths.flatMap((path) => path.nodes.map((node) => `${path.id}:${node.id}`))
    )
  }, [selectedGlyphId, setSelectedNodeIds])

  const handleToolSelect = useCallback(
    (toolId: 'pointer' | 'pen' | 'brush' | 'hand') => {
      sceneControllerRef.current?.setActiveTool(toolId)
      setActiveToolId(toolId)
    },
    []
  )

  const positionedGlyph = useMemo((): PositionedGlyph | undefined => {
    if (!fontData || !selectedGlyphId) {
      return undefined
    }
    const glyph = fontData.glyphs[selectedGlyphId]
    if (!glyph) return undefined
    const activeLayer = getGlyphLayer(glyph, selectedLayerId)
    if (!activeLayer) {
      return undefined
    }
    const cacheKey = `${glyph.id}:${activeLayer.id}`
    const cachedGeometry = layerGeometryCacheRef.current.get(cacheKey)
    if (cachedGeometry && cachedGeometry.layerRef === activeLayer) {
      return {
        glyph: {
          path: cachedGeometry.varPath,
          xAdvance: activeLayer.metrics.width,
          components: cachedGeometry.components,
          guidelines: cachedGeometry.guidelines,
          flattenedPath2d: undefined,
          closedContoursPath2d: undefined,
        },
        glyphId: glyph.id,
        x: 0,
        y: 0,
        pointRefs: cachedGeometry.pointRefs,
        isEditing: true,
        isEmpty: activeLayer.paths.length === 0,
      }
    }

    const pointRefs = activeLayer.paths.flatMap((path) =>
      path.nodes.map((node) => ({
        pathId: path.id,
        nodeId: node.id,
      }))
    )

    const pathDataToVarPackedPath = (paths: typeof activeLayer.paths) => {
      const contours: {
        points: {
          x: number
          y: number
          type: 'onCurve' | 'offCurveQuad' | 'offCurveCubic'
          smooth?: boolean
        }[]
        isClosed: boolean
      }[] = []

      for (const pathData of paths) {
        const points = pathData.nodes.map((node) => ({
          x: node.x,
          y: node.y,
          type: (node.type === 'offcurve'
            ? 'offCurveCubic'
            : node.type === 'qcurve'
              ? 'offCurveQuad'
              : 'onCurve') as 'onCurve' | 'offCurveQuad' | 'offCurveCubic',
          smooth: getEffectiveNodeType(pathData, node) === 'smooth',
        }))

        contours.push({
          points,
          isClosed: pathData.closed,
        })
      }

      return VarPackedPath.fromUnpackedContours(contours)
    }

    const buildComponentPath2D = (
      componentGlyphId: string,
      depth = 0,
      visited = new Set<string>()
    ): Path2D | undefined => {
      if (depth > 8 || visited.has(componentGlyphId)) {
        return undefined
      }

      const sourceGlyph = fontData.glyphs[componentGlyphId]
      const sourceLayer = getGlyphLayer(sourceGlyph, selectedLayerId)
      if (!sourceGlyph || !sourceLayer) {
        return undefined
      }

      const nextVisited = new Set(visited)
      nextVisited.add(componentGlyphId)
      const sourceCacheKey = `${componentGlyphId}:${sourceLayer.id}`
      const sourceCachedGeometry = layerGeometryCacheRef.current.get(sourceCacheKey)
      const sourceVarPath =
        sourceCachedGeometry && sourceCachedGeometry.layerRef === sourceLayer
          ? sourceCachedGeometry.varPath
          : pathDataToVarPackedPath(sourceLayer.paths)
      const combinedPath = new Path2D(sourceVarPath.toSVGPath())

      for (const componentRef of sourceLayer.componentRefs) {
        const nestedPath = buildComponentPath2D(componentRef.glyphId, depth + 1, nextVisited)
        if (!nestedPath) {
          continue
        }
        const matrix = new DOMMatrix()
          .translateSelf(componentRef.x, componentRef.y)
          .rotateSelf(componentRef.rotation)
          .scaleSelf(componentRef.scaleX, componentRef.scaleY)
        combinedPath.addPath(nestedPath, matrix)
      }

      return combinedPath
    }

    const varPath = pathDataToVarPackedPath(activeLayer.paths)
    const components: NonNullable<GlyphData['components']> = []
    for (const componentRef of activeLayer.componentRefs) {
      const path2d = buildComponentPath2D(componentRef.glyphId)
      if (!path2d) {
        continue
      }
      components.push({
        name: componentRef.glyphId,
        transformation: {
          translateX: componentRef.x,
          translateY: componentRef.y,
          scaleX: componentRef.scaleX,
          scaleY: componentRef.scaleY,
          rotation: componentRef.rotation,
        },
        path2d,
      })
    }
    const guidelines = (activeLayer.guidelines ?? []).map((guide) => ({
        x: guide.x,
        y: guide.y,
        angle: guide.angle,
        locked: guide.locked,
      }))

    layerGeometryCacheRef.current.set(cacheKey, {
      layerRef: activeLayer,
      pointRefs,
      varPath,
      components,
      guidelines,
    })

    return {
      glyph: {
        path: varPath,
        xAdvance: activeLayer.metrics.width,
        components,
        guidelines,
        flattenedPath2d: undefined,
        closedContoursPath2d: undefined,
      },
      glyphId: glyph.id,
      x: 0,
      y: 0,
      pointRefs,
      isEditing: true,
      isEmpty: activeLayer.paths.length === 0,
    }
  }, [fontData, selectedGlyphId, selectedLayerId])

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
        if (nodeIds.length > 0) {
          setSelectedSegment(null)
        }
      },
      onSelectedPathHitChange: (pathHit) => {
        const pointRefs = sceneController.sceneModel.glyph?.pointRefs ?? []
        if (!pathHit || pathHit.segment.pointIndices.length < 2) {
          setSelectedSegment(null)
          return
        }

        const [startIndex, endIndex] = pathHit.segment.pointIndices
        const startRef = pointRefs[startIndex]
        const endRef = pointRefs[endIndex]
        if (!startRef || !endRef || startRef.pathId !== endRef.pathId) {
          setSelectedSegment(null)
          return
        }

        setSelectedSegment({
          pathId: startRef.pathId,
          startNodeId: startRef.nodeId,
          endNodeId: endRef.nodeId,
          type: pathHit.segment.type ?? 'line',
        })
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
      sceneController.destroy()
      controller.destroy()
      canvasControllerRef.current = null
      sceneControllerRef.current = null
      sceneViewRef.current = null
    }
  }, [setSelectedNodeIds, setSelectedSegment, updateViewport])

  // Update scene model when data changes
  useEffect(() => {
    const sceneView = sceneViewRef.current
    const sceneController = sceneControllerRef.current
    if (!sceneView || !sceneController) {
      return
    }

    // Update scene model
    sceneController.sceneModel.glyph = positionedGlyph
    sceneController.sceneModel.lineMetricsHorizontalLayout =
      fontData?.lineMetricsHorizontalLayout
    const selectionPointIds = new Set(
      selectedNodeIds.flatMap((selectedNodeId) => {
        const pointRefs = positionedGlyph?.pointRefs ?? []
        const pointIndex = pointRefs.findIndex(
          (pointRef) => `${pointRef.pathId}:${pointRef.nodeId}` === selectedNodeId
        )
        return pointIndex >= 0 ? [`point/${pointIndex}`] : []
      })
    )
    sceneController.sceneModel.selection = selectionPointIds
    sceneController.selection = selectionPointIds

    // Update viewport
    const controller = canvasControllerRef.current
    if (controller) {
      controller.origin.x = controller.canvasWidth / 2 + viewport.pan.x
      controller.origin.y = controller.canvasHeight / 2 + viewport.pan.y
      controller.magnification = viewport.zoom
    }

    // Request redraw
    controller?.requestUpdate()
  }, [fontData, positionedGlyph, selectedGlyphId, selectedNodeIds, viewport])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
      }

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
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault()
          void handleCopySelection()
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault()
          void handlePasteSelection()
        }
      } else if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        selectedGlyphId &&
        selectedNodeIds.length > 0
      ) {
        e.preventDefault()
        const nextPenSelection = getPreviousPenSelection()
        deleteSelectedNodes(selectedGlyphId, selectedNodeIds)
        if (nextPenSelection) {
          setSelectedNodeIds([nextPenSelection])
        }
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('pointer')
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('pen')
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('brush')
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('hand')
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault()
        if (!temporaryToolRef.current) {
          temporaryToolRef.current = activeToolId
          handleToolSelect('hand')
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
      }

      if (e.key !== ' ') {
        return
      }

      if (temporaryToolRef.current) {
        const previousTool = temporaryToolRef.current
        temporaryToolRef.current = null
        handleToolSelect(previousTool)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [activeToolId, deleteSelectedNodes, getPreviousPenSelection, handleCopySelection, handlePasteSelection, handleRedo, handleToolSelect, handleUndo, selectedGlyphId, selectedNodeIds, setSelectedNodeIds])

  return (
    <Box
      position="relative"
      w="100%"
      h="100%"
      bg="white"
      overflow="hidden"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'default',
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
          `V` 游標，`P` 鋼筆，`B` 筆刷，`H` 移動畫布
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
            <Button
              key={tool.id}
              size="xs"
              px={2}
              py={1}
              borderRadius="md"
              variant={activeToolId === tool.id ? 'solid' : 'ghost'}
              colorScheme={activeToolId === tool.id ? 'teal' : undefined}
              bg={
                activeToolId === tool.id
                  ? undefined
                  : tool.status === 'ready'
                  ? 'whiteAlpha.200'
                  : 'orange.300'
              }
              color={activeToolId === tool.id ? undefined : tool.status === 'ready' ? 'whiteAlpha.900' : 'black'}
              fontSize="xs"
              onClick={() => handleToolSelect(tool.id)}
            >
              {tool.label}
            </Button>
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
        <Box as="span" bg="whiteAlpha.200" px={1} borderRadius="sm">
          Space
        </Box>
        <Text>Hold Hand Tool</Text>
      </Flex>
    </Box>
  )
}
