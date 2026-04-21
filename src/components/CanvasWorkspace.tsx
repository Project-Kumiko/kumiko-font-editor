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
import { getEffectiveNodeType, getGlyphLayer, useStore, useTemporalStore, type NodeType } from '../store'
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
  const temporaryToolRef = useRef<'pointer' | 'pen' | 'brush' | 'hand' | 'text' | null>(null)
  const hiddenTextInputRef = useRef<HTMLTextAreaElement | null>(null)
  const [activeToolId, setActiveToolId] = useState<'pointer' | 'pen' | 'brush' | 'hand' | 'text'>('pointer')
  const [textInputValue, setTextInputValue] = useState('')
  const [isComposingText, setIsComposingText] = useState(false)
  const [compositionText, setCompositionText] = useState('')
  const availableTools = [
    { id: 'pointer', label: 'Pointer', status: 'ready' },
    { id: 'pen', label: 'Pen', status: 'ready' },
    { id: 'brush', label: 'Brush', status: 'ready' },
    { id: 'text', label: 'Text', status: 'ready' },
    { id: 'hand', label: 'Hand', status: 'ready' },
  ] as const

  // Store data
  const fontData = useStore((state) => state.fontData)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const editorGlyphIds = useStore((state) => state.editorGlyphIds)
  const editorText = useStore((state) => state.editorText)
  const editorTextCursorIndex = useStore((state) => state.editorTextCursorIndex)
  const editorActiveGlyphIndex = useStore((state) => state.editorActiveGlyphIndex)
  const selectedLayerId = useStore((state) => state.selectedLayerId)
  const selectedNodeIds = useStore((state) => state.selectedNodeIds)
  const selectedSegment = useStore((state) => state.selectedSegment)
  const clearPreviewGlyphMetrics = useStore((state) => state.clearPreviewGlyphMetrics)
  const viewport = useStore((state) => state.viewport)
  const setSelectedNodeIds = useStore((state) => state.setSelectedNodeIds)
  const setSelectedSegment = useStore((state) => state.setSelectedSegment)
  const setEditorTextCursorIndex = useStore((state) => state.setEditorTextCursorIndex)
  const setEditorActiveGlyphIndex = useStore((state) => state.setEditorActiveGlyphIndex)
  const setEditorTextState = useStore((state) => state.setEditorTextState)
  const updateViewport = useStore((state) => state.updateViewport)
  const deleteSelectedNodes = useStore((state) => state.deleteSelectedNodes)
  const updateNodePositions = useStore((state) => state.updateNodePositions)
  const activeEditorGlyphId =
    editorGlyphIds[editorActiveGlyphIndex] ?? selectedGlyphId ?? null

  const getPreviousPenSelection = useCallback(() => {
    if (
      activeToolId !== 'pen' ||
      !fontData ||
      !activeEditorGlyphId ||
      selectedNodeIds.length !== 1
    ) {
      return null
    }

    const [pathId, nodeId] = selectedNodeIds[0].split(':')
    const path = fontData.glyphs[activeEditorGlyphId]?.paths.find((candidate) => candidate.id === pathId)
    if (!path) {
      return null
    }

    const currentIndex = path.nodes.findIndex((node) => node.id === nodeId)
    if (currentIndex <= 0) {
      return null
    }

    return `${pathId}:${path.nodes[currentIndex - 1].id}`
  }, [activeEditorGlyphId, activeToolId, fontData, selectedNodeIds])

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
    if (!fontData || !activeEditorGlyphId) {
      return
    }

    const glyph = fontData.glyphs[activeEditorGlyphId]
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
  }, [activeEditorGlyphId, fontData, selectedNodeIds, selectedSegment])

  const handlePasteSelection = useCallback(async () => {
    if (!activeEditorGlyphId) {
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
      store.createPath(activeEditorGlyphId, path)
    }

    setSelectedNodeIds(
      paths.flatMap((path) => path.nodes.map((node) => `${path.id}:${node.id}`))
    )
  }, [activeEditorGlyphId, setSelectedNodeIds])

  const handleToolSelect = useCallback(
    (toolId: 'pointer' | 'pen' | 'brush' | 'hand' | 'text') => {
      sceneControllerRef.current?.setActiveTool(toolId)
      setActiveToolId(toolId)
      setSelectedNodeIds([])
      setSelectedSegment(null)
    },
    [setSelectedNodeIds, setSelectedSegment]
  )

  const positionedGlyphs = useMemo((): PositionedGlyph[] => {
    if (!fontData) {
      return []
    }

    const pathDataToVarPackedPath = (
      paths: Array<{
        id: string
        closed: boolean
        nodes: Array<{
          id: string
          x: number
          y: number
          type: NodeType
        }>
      }>
    ) => {
      const contours = paths.map((pathData) => ({
        points: pathData.nodes.map((node) => ({
          x: node.x,
          y: node.y,
          type: (node.type === 'offcurve'
            ? 'offCurveCubic'
            : node.type === 'qcurve'
              ? 'offCurveQuad'
              : 'onCurve') as 'onCurve' | 'offCurveQuad' | 'offCurveCubic',
          smooth: getEffectiveNodeType(pathData, node) === 'smooth',
        })),
        isClosed: pathData.closed,
      }))

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

    let cursorX = 0
    const builtGlyphs = editorGlyphIds
      .map((glyphId) => {
        const glyph = fontData.glyphs[glyphId]
        const activeLayer = getGlyphLayer(glyph, selectedLayerId)
        if (!glyph || !activeLayer) {
          return null
        }

        const cacheKey = `${glyph.id}:${activeLayer.id}`
        const cachedGeometry = layerGeometryCacheRef.current.get(cacheKey)
        let pointRefs: Array<{ pathId: string; nodeId: string }>
        let varPath: InstanceType<typeof VarPackedPath>
        let components: NonNullable<GlyphData['components']>
        let guidelines: NonNullable<GlyphData['guidelines']>

        if (cachedGeometry && cachedGeometry.layerRef === activeLayer) {
          pointRefs = cachedGeometry.pointRefs
          varPath = cachedGeometry.varPath
          components = cachedGeometry.components
          guidelines = cachedGeometry.guidelines
        } else {
          pointRefs = activeLayer.paths.flatMap((path) =>
            path.nodes.map((node) => ({
              pathId: path.id,
              nodeId: node.id,
            }))
          )
          varPath = pathDataToVarPackedPath(activeLayer.paths)
          components = []
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
          guidelines = (activeLayer.guidelines ?? []).map((guide) => ({
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
        }

        const positionedGlyph: PositionedGlyph = {
          glyph: {
            path: varPath,
            xAdvance: activeLayer.metrics.width,
            components,
            guidelines,
            flattenedPath2d: undefined,
            closedContoursPath2d: undefined,
          },
          glyphId: glyph.id,
          displayCharacter: (() => {
            if (!glyph.unicode) {
              return glyph.name || glyph.id
            }
            const codePoint = Number.parseInt(glyph.unicode, 16)
            return Number.isFinite(codePoint)
              ? String.fromCodePoint(codePoint)
              : (glyph.name || glyph.id)
          })(),
          x: cursorX,
          y: 0,
          pointRefs,
          isEditing: activeToolId !== 'text' && glyph.id === editorGlyphIds[editorActiveGlyphIndex],
          isSelected: glyph.id === editorGlyphIds[editorActiveGlyphIndex],
          isEmpty: activeLayer.paths.length === 0,
        }
        cursorX += activeLayer.metrics.width + 80
        return positionedGlyph
      })
      .filter((glyph): glyph is PositionedGlyph => Boolean(glyph))

    return builtGlyphs
  }, [activeToolId, editorActiveGlyphIndex, editorGlyphIds, fontData, selectedLayerId])

  const positionedGlyph = useMemo(
    () =>
      positionedGlyphs[editorActiveGlyphIndex] ??
      positionedGlyphs.find((glyph) => glyph.glyphId === selectedGlyphId),
    [editorActiveGlyphIndex, positionedGlyphs, selectedGlyphId]
  )

  const glyphIdByCharacter = useMemo(() => {
    const entries = new Map<string, string>()
    if (!fontData) {
      return entries
    }

    for (const glyph of Object.values(fontData.glyphs)) {
      if (!glyph.unicode) {
        continue
      }
      const codePoint = Number.parseInt(glyph.unicode, 16)
      if (!Number.isFinite(codePoint)) {
        continue
      }
      const character = String.fromCodePoint(codePoint)
      if (!entries.has(character)) {
        entries.set(character, glyph.id)
      }
    }

    return entries
  }, [fontData])

  const charIndexToCodeUnitIndex = useCallback((text: string, charIndex: number) => {
    return Array.from(text).slice(0, charIndex).join('').length
  }, [])

  const codeUnitIndexToCharIndex = useCallback((text: string, codeUnitIndex: number) => {
    let consumedUnits = 0
    let charIndex = 0
    for (const character of Array.from(text)) {
      if (consumedUnits >= codeUnitIndex) {
        break
      }
      consumedUnits += character.length
      charIndex += 1
    }
    return charIndex
  }, [])

  const getGlyphFrameAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      const metrics = fontData?.lineMetricsHorizontalLayout
      const yMin = metrics?.descender?.value ?? -220
      const yMax = metrics?.ascender?.value ?? 900

      for (let index = positionedGlyphs.length - 1; index >= 0; index -= 1) {
        const positionedGlyph = positionedGlyphs[index]
        const xMin = positionedGlyph.x
        const xMax = positionedGlyph.x + positionedGlyph.glyph.xAdvance
        const translatedX = point.x
        const translatedY = point.y - positionedGlyph.y
        if (
          translatedX >= xMin &&
          translatedX <= xMax &&
          translatedY >= yMin &&
          translatedY <= yMax
        ) {
          return {
            glyphId: positionedGlyph.glyphId ?? null,
            glyphIndex: index,
            xMin,
            xMax,
          }
        }
      }

      return null
    },
    [fontData?.lineMetricsHorizontalLayout, positionedGlyphs]
  )

  const commitTextInputValue = useCallback(
    (value: string, selectionStart: number | null) => {
      const beforeCursor = value.slice(0, selectionStart ?? value.length)
      const supportedChars = Array.from(value).filter((character) => glyphIdByCharacter.has(character))
      const supportedBeforeCursor = Array.from(beforeCursor).filter((character) =>
        glyphIdByCharacter.has(character)
      )
      const glyphIds = supportedChars
        .map((character) => glyphIdByCharacter.get(character))
        .filter((glyphId): glyphId is string => Boolean(glyphId))
      setEditorTextState(
        supportedChars.join(''),
        glyphIds,
        supportedBeforeCursor.length,
        glyphIds.length > 0
          ? Math.max(0, Math.min(supportedBeforeCursor.length - 1, glyphIds.length - 1))
          : 0
      )
      setTextInputValue(supportedChars.join(''))
    },
    [glyphIdByCharacter, setEditorTextState]
  )

  const getCursorX = useCallback(
    (cursorIndex: number) => {
      const cursorGlyph = positionedGlyphs[cursorIndex]
      const previousGlyph = positionedGlyphs[cursorIndex - 1]
      return cursorGlyph
        ? cursorGlyph.x
        : previousGlyph
          ? previousGlyph.x + previousGlyph.glyph.xAdvance + 80
          : 0
    },
    [positionedGlyphs]
  )

  const compositionOverlayStyle = useMemo(() => {
    if (
      activeToolId !== 'text' ||
      !isComposingText ||
      !compositionText ||
      !canvasControllerRef.current
    ) {
      return null
    }

    const controller = canvasControllerRef.current

    return {
      left: controller.origin.x + getCursorX(editorTextCursorIndex) * controller.magnification,
      top: controller.origin.y - 28,
    }
  }, [activeToolId, compositionText, editorTextCursorIndex, getCursorX, isComposingText])

  useEffect(() => {
    if (!isComposingText) {
      setTextInputValue(editorText)
    }
  }, [editorText, isComposingText])

  useEffect(() => {
    if (!isComposingText) {
      setCompositionText('')
    }
  }, [isComposingText])

  useEffect(() => {
    if (activeToolId !== 'text') {
      return
    }

    const input = hiddenTextInputRef.current
    if (!input) {
      return
    }

    const selectionOffset = charIndexToCodeUnitIndex(textInputValue, editorTextCursorIndex)
    input.focus()
    input.setSelectionRange(selectionOffset, selectionOffset)
  }, [activeToolId, charIndexToCodeUnitIndex, editorTextCursorIndex, textInputValue])

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
      glyphs: [],
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
      onPreviewGlyphMetrics: (glyphId, metrics) => {
        useStore.getState().setPreviewGlyphMetrics(glyphId, metrics)
      },
      onClearPreviewGlyphMetrics: (glyphId) => {
        useStore.getState().clearPreviewGlyphMetrics(glyphId)
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

  useEffect(() => {
    if (!selectedGlyphId) {
      clearPreviewGlyphMetrics()
    }
  }, [clearPreviewGlyphMetrics, selectedGlyphId])

  // Update scene model when data changes
  useEffect(() => {
    const sceneView = sceneViewRef.current
    const sceneController = sceneControllerRef.current
    if (!sceneView || !sceneController) {
      return
    }

    // Update scene model
    sceneController.sceneModel.glyph = positionedGlyph
    sceneController.sceneModel.glyphs = positionedGlyphs
    if (activeToolId === 'text') {
      const metrics = fontData?.lineMetricsHorizontalLayout
      const yMin = metrics?.descender?.value ?? -220
      const yMax = metrics?.ascender?.value ?? 900
      const cursorX = getCursorX(editorTextCursorIndex)
      sceneController.sceneModel.textCursor = { x: cursorX, yMin, yMax }
    } else {
      sceneController.sceneModel.textCursor = undefined
    }
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
  }, [activeToolId, editorTextCursorIndex, fontData, getCursorX, positionedGlyph, positionedGlyphs, selectedGlyphId, selectedNodeIds, viewport])

  useEffect(() => {
    const canvas = canvasRef.current
    const controller = canvasControllerRef.current
    if (!canvas || !controller) {
      return
    }

    const handleCanvasClick = (event: MouseEvent) => {
      const localPoint = controller.localPoint({ x: event.pageX, y: event.pageY })
      const hit = getGlyphFrameAtPoint(localPoint)
      if (!hit?.glyphId) {
        return
      }

      if (activeToolId === 'text') {
        event.preventDefault()
        event.stopPropagation()
        const midpoint = (hit.xMin + hit.xMax) / 2
        setEditorActiveGlyphIndex(hit.glyphIndex)
        setEditorTextCursorIndex(localPoint.x < midpoint ? hit.glyphIndex : hit.glyphIndex + 1)
        hiddenTextInputRef.current?.focus()
        return
      }

      if (hit.glyphId !== activeEditorGlyphId) {
        event.preventDefault()
        event.stopPropagation()
        setEditorActiveGlyphIndex(hit.glyphIndex)
      }
    }

    const handleCanvasDoubleClick = (event: MouseEvent) => {
      const localPoint = controller.localPoint({ x: event.pageX, y: event.pageY })
      const hit = getGlyphFrameAtPoint(localPoint)
      if (!hit?.glyphId) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setEditorActiveGlyphIndex(hit.glyphIndex)
      if (activeToolId === 'text') {
        handleToolSelect('pointer')
      }
    }

    canvas.addEventListener('click', handleCanvasClick)
    canvas.addEventListener('dblclick', handleCanvasDoubleClick)
    return () => {
      canvas.removeEventListener('click', handleCanvasClick)
      canvas.removeEventListener('dblclick', handleCanvasDoubleClick)
    }
  }, [activeEditorGlyphId, activeToolId, getGlyphFrameAtPoint, handleToolSelect, setEditorActiveGlyphIndex, setEditorTextCursorIndex])

  // Keyboard shortcuts
  useEffect(() => {
    const activeGlyph = activeEditorGlyphId && fontData ? fontData.glyphs[activeEditorGlyphId] : null
    const activeLayer = activeGlyph ? getGlyphLayer(activeGlyph, selectedLayerId) : null

    const selectAllGlyphNodes = () => {
      if (activeToolId === 'text') {
        return
      }
      if (!activeLayer) {
        return
      }

      const allNodeIds = activeLayer.paths.flatMap((path) =>
        path.nodes.map((node) => `${path.id}:${node.id}`)
      )
      setSelectedSegment(null)
      setSelectedNodeIds(allNodeIds)
    }

    const nudgeSelectedNodes = (dx: number, dy: number) => {
      if (activeToolId === 'text') {
        return
      }
      if (!activeEditorGlyphId || !activeLayer || selectedNodeIds.length === 0) {
        return
      }

      const updates = selectedNodeIds.flatMap((selectedNodeId) => {
        const [pathId, nodeId] = selectedNodeId.split(':')
        const path = activeLayer.paths.find((candidate) => candidate.id === pathId)
        const node = path?.nodes.find((candidate) => candidate.id === nodeId)
        if (!path || !node) {
          return []
        }

        return [
          {
            pathId,
            nodeId,
            newPos: {
              x: node.x + dx,
              y: node.y + dy,
            },
          },
        ]
      })

      if (updates.length === 0) {
        return
      }

      updateNodePositions(activeEditorGlyphId, updates)
    }

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
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          e.stopPropagation()
          selectAllGlyphNodes()
        }
      } else if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        activeEditorGlyphId &&
        selectedNodeIds.length > 0
      ) {
        e.preventDefault()
        const nextPenSelection = getPreviousPenSelection()
        deleteSelectedNodes(activeEditorGlyphId, selectedNodeIds)
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
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('text')
      } else if (selectedNodeIds.length > 0 && e.key === 'ArrowLeft') {
        e.preventDefault()
        e.stopPropagation()
        nudgeSelectedNodes(-1, 0)
      } else if (selectedNodeIds.length > 0 && e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        nudgeSelectedNodes(1, 0)
      } else if (selectedNodeIds.length > 0 && e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        nudgeSelectedNodes(0, 1)
      } else if (selectedNodeIds.length > 0 && e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        nudgeSelectedNodes(0, -1)
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
  }, [activeEditorGlyphId, activeToolId, deleteSelectedNodes, fontData, getPreviousPenSelection, handleCopySelection, handlePasteSelection, handleRedo, handleToolSelect, handleUndo, selectedLayerId, selectedNodeIds, setSelectedNodeIds, setSelectedSegment, updateNodePositions])

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
      <textarea
        ref={hiddenTextInputRef}
        value={textInputValue}
        onChange={(event) => {
          setTextInputValue(event.target.value)
          if (!isComposingText) {
            commitTextInputValue(event.target.value, event.target.selectionStart)
          }
        }}
        onSelect={(event) => {
          if (activeToolId !== 'text') {
            return
          }
          const target = event.target as HTMLTextAreaElement
          const cursorIndex = codeUnitIndexToCharIndex(target.value, target.selectionStart ?? target.value.length)
          setEditorTextCursorIndex(cursorIndex)
          if (editorGlyphIds.length > 0) {
            setEditorActiveGlyphIndex(Math.max(0, Math.min(cursorIndex - 1, editorGlyphIds.length - 1)))
          }
        }}
        onCompositionStart={() => {
          setIsComposingText(true)
        }}
        onCompositionUpdate={(event) => {
          setCompositionText(event.data)
        }}
        onCompositionEnd={(event) => {
          setIsComposingText(false)
          setCompositionText('')
          commitTextInputValue(event.currentTarget.value, event.currentTarget.selectionStart)
        }}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: activeToolId === 'text' ? 'auto' : 'none',
          width: 1,
          height: 1,
          left: 0,
          top: 0,
        }}
      />
      {compositionOverlayStyle ? (
        <Box
          position="absolute"
          left={`${compositionOverlayStyle.left}px`}
          top={`${compositionOverlayStyle.top}px`}
          transform="translateX(-1px)"
          px={1}
          py={0.5}
          fontSize="20px"
          lineHeight="1.2"
          color="gray.900"
          bg="rgba(255,255,255,0.92)"
          borderRadius="sm"
          borderBottom="2px solid"
          borderColor="teal.500"
          pointerEvents="none"
          whiteSpace="pre"
        >
          {compositionText}
        </Box>
      ) : null}

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
          `V` 游標，`P` 鋼筆，`B` 筆刷，`T` 文字，`H` 移動畫布
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
