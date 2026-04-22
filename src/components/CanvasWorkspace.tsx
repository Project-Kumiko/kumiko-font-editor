import { Box } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CanvasController,
  SceneView,
  VisualizationLayer,
  visualizationLayerDefinitions,
  type SceneModel,
} from '../canvas'
import { SceneController } from '../tools'
import { getGlyphLayer, useStore, useTemporalStore } from '../store'
import {
  buildClipboardPayloadFromSelection,
  materializeClipboardPaths,
  parseClipboardPathsText,
  serializeClipboardPaths,
} from '../utils/clipboardPaths'
import { CanvasWorkspaceOverlay } from './canvasWorkspace/CanvasWorkspaceOverlay'
import { HiddenTextInput } from './canvasWorkspace/HiddenTextInput'
import {
  buildPositionedGlyphs,
  getGlyphFrameAtPoint,
  type LayerGeometryCacheEntry,
} from './canvasWorkspace/positionedGlyphs'
import {
  buildGlyphIdByCharacter,
  charIndexToCodeUnitIndex,
  codeUnitIndexToCharIndex,
} from './canvasWorkspace/textInput'
import type { ToolId } from './canvasWorkspace/types'

export function CanvasWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasControllerRef = useRef<CanvasController | null>(null)
  const sceneControllerRef = useRef<SceneController | null>(null)
  const sceneViewRef = useRef<SceneView | null>(null)
  const temporaryToolRef = useRef<ToolId | null>(null)
  const hiddenTextInputRef = useRef<HTMLTextAreaElement | null>(null)
  const layerGeometryCache = useMemo(
    () => new Map<string, LayerGeometryCacheEntry>(),
    []
  )
  const [activeToolId, setActiveToolId] = useState<ToolId>('pointer')
  const [draftTextInputValue, setDraftTextInputValue] = useState('')
  const [isComposingText, setIsComposingText] = useState(false)
  const [compositionText, setCompositionText] = useState('')
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

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

  const pastStatesLength = useTemporalStore((state) => state.pastStates.length)
  const futureStatesLength = useTemporalStore((state) => state.futureStates.length)
  const textInputValue = isComposingText ? draftTextInputValue : editorText

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
    (toolId: ToolId) => {
      sceneControllerRef.current?.setActiveTool(toolId)
      setActiveToolId(toolId)
      setSelectedNodeIds([])
      setSelectedSegment(null)
    },
    [setSelectedNodeIds, setSelectedSegment]
  )

  const positionedGlyphs = useMemo(
    () =>
      buildPositionedGlyphs({
        activeToolId,
        editorActiveGlyphIndex,
        editorGlyphIds,
        fontData,
        selectedLayerId,
        layerGeometryCache,
      }),
    [
      activeToolId,
      editorActiveGlyphIndex,
      editorGlyphIds,
      fontData,
      layerGeometryCache,
      selectedLayerId,
    ]
  )

  const positionedGlyph = useMemo(
    () =>
      positionedGlyphs[editorActiveGlyphIndex] ??
      positionedGlyphs.find((glyph) => glyph.glyphId === selectedGlyphId),
    [editorActiveGlyphIndex, positionedGlyphs, selectedGlyphId]
  )

  const glyphIdByCharacter = useMemo(
    () => buildGlyphIdByCharacter(fontData),
    [fontData]
  )

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
    const path = fontData.glyphs[activeEditorGlyphId]?.paths.find(
      (candidate) => candidate.id === pathId
    )
    if (!path) {
      return null
    }

    const currentIndex = path.nodes.findIndex((node) => node.id === nodeId)
    if (currentIndex <= 0) {
      return null
    }

    return `${pathId}:${path.nodes[currentIndex - 1].id}`
  }, [activeEditorGlyphId, activeToolId, fontData, selectedNodeIds])

  const resolveGlyphFrameAtPoint = useCallback(
    (point: { x: number; y: number }) =>
      getGlyphFrameAtPoint(point, positionedGlyphs, fontData),
    [fontData, positionedGlyphs]
  )

  const commitTextInputValue = useCallback(
    (value: string, selectionStart: number | null) => {
      const beforeCursor = value.slice(0, selectionStart ?? value.length)
      const supportedChars = Array.from(value).filter((character) =>
        glyphIdByCharacter.has(character)
      )
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
      setDraftTextInputValue(supportedChars.join(''))
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
      canvasSize.width === 0
    ) {
      return null
    }

    return {
      left: canvasSize.width / 2 + viewport.pan.x + getCursorX(editorTextCursorIndex) * viewport.zoom,
      top: canvasSize.height / 2 + viewport.pan.y - 28,
    }
  }, [
    activeToolId,
    canvasSize.height,
    canvasSize.width,
    compositionText,
    editorTextCursorIndex,
    getCursorX,
    isComposingText,
    viewport.pan.x,
    viewport.pan.y,
    viewport.zoom,
  ])

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
  }, [activeToolId, editorTextCursorIndex, textInputValue])

  useEffect(() => {
    if (!canvasRef.current || canvasControllerRef.current) {
      return
    }

    const canvas = canvasRef.current
    const controller = new CanvasController(canvas)
    canvasControllerRef.current = controller

    const layers = visualizationLayerDefinitions.map(
      (definition) => new VisualizationLayer(definition)
    )
    const sceneView = new SceneView(layers)
    sceneViewRef.current = sceneView
    controller.sceneView = sceneView

    const sceneModel: SceneModel = {
      glyph: undefined,
      glyphs: [],
      selection: new Set(),
      hoverSelection: new Set(),
      canEdit: true,
    }

    controller.sceneModel = sceneModel

    const sceneController = new SceneController({
      canvasController: controller,
      model: sceneModel,
      onSelectionChange: (selection) => {
        const pointRefs = sceneController.sceneModel.glyph?.pointRefs ?? []
        const nodeIds: string[] = []
        for (const item of selection) {
          const match = item.match(/^point\/(\d+)$/)
          if (!match) {
            continue
          }
          const nodeIndex = Number.parseInt(match[1], 10)
          const pointRef = pointRefs[nodeIndex]
          if (pointRef) {
            nodeIds.push(`${pointRef.pathId}:${pointRef.nodeId}`)
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
      setCanvasSize({
        width: controller.canvasWidth,
        height: controller.canvasHeight,
      })
      updateViewport(
        controller.magnification,
        controller.origin.x - controller.canvasWidth / 2,
        controller.origin.y - controller.canvasHeight / 2
      )
    }

    canvas.addEventListener('viewBoxChanged', syncViewportFromCanvas)
    setCanvasSize({
      width: controller.canvasWidth,
      height: controller.canvasHeight,
    })
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

  useEffect(() => {
    const sceneController = sceneControllerRef.current
    const controller = canvasControllerRef.current
    if (!sceneController || !controller) {
      return
    }

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

    controller.origin.x = controller.canvasWidth / 2 + viewport.pan.x
    controller.origin.y = controller.canvasHeight / 2 + viewport.pan.y
    controller.magnification = viewport.zoom
    controller.requestUpdate()
  }, [activeToolId, editorTextCursorIndex, fontData, getCursorX, positionedGlyph, positionedGlyphs, selectedNodeIds, viewport])

  useEffect(() => {
    const canvas = canvasRef.current
    const controller = canvasControllerRef.current
    if (!canvas || !controller) {
      return
    }

    const handleCanvasClick = (event: MouseEvent) => {
      const localPoint = controller.localPoint({ x: event.pageX, y: event.pageY })
      const hit = resolveGlyphFrameAtPoint(localPoint)
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
      const hit = resolveGlyphFrameAtPoint(localPoint)
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
  }, [activeEditorGlyphId, activeToolId, handleToolSelect, resolveGlyphFrameAtPoint, setEditorActiveGlyphIndex, setEditorTextCursorIndex])

  useEffect(() => {
    const activeGlyph = activeEditorGlyphId && fontData ? fontData.glyphs[activeEditorGlyphId] : null
    const activeLayer = activeGlyph ? getGlyphLayer(activeGlyph, selectedLayerId) : null

    const selectAllGlyphNodes = () => {
      if (activeToolId === 'text' || !activeLayer) {
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

        return [{
          pathId,
          nodeId,
          newPos: {
            x: node.x + dx,
            y: node.y + dy,
          },
        }]
      })

      if (updates.length > 0) {
        updateNodePositions(activeEditorGlyphId, updates)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
      }

      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (event.metaKey || event.ctrlKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          handleRedo()
        } else if (event.key === 'c' || event.key === 'C') {
          event.preventDefault()
          void handleCopySelection()
        } else if (event.key === 'v' || event.key === 'V') {
          event.preventDefault()
          void handlePasteSelection()
        } else if (event.key === 'a' || event.key === 'A') {
          event.preventDefault()
          event.stopPropagation()
          selectAllGlyphNodes()
        }
      } else if (
        (event.key === 'Backspace' || event.key === 'Delete') &&
        activeEditorGlyphId &&
        selectedNodeIds.length > 0
      ) {
        event.preventDefault()
        const nextPenSelection = getPreviousPenSelection()
        deleteSelectedNodes(activeEditorGlyphId, selectedNodeIds)
        if (nextPenSelection) {
          setSelectedNodeIds([nextPenSelection])
        }
      } else if (event.key === 'v' || event.key === 'V') {
        event.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('pointer')
      } else if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('pen')
      } else if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('brush')
      } else if (event.key === 'h' || event.key === 'H') {
        event.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('hand')
      } else if (event.key === 't' || event.key === 'T') {
        event.preventDefault()
        temporaryToolRef.current = null
        handleToolSelect('text')
      } else if (selectedNodeIds.length > 0 && event.key === 'ArrowLeft') {
        event.preventDefault()
        event.stopPropagation()
        nudgeSelectedNodes(-1, 0)
      } else if (selectedNodeIds.length > 0 && event.key === 'ArrowRight') {
        event.preventDefault()
        event.stopPropagation()
        nudgeSelectedNodes(1, 0)
      } else if (selectedNodeIds.length > 0 && event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        nudgeSelectedNodes(0, 1)
      } else if (selectedNodeIds.length > 0 && event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        nudgeSelectedNodes(0, -1)
      } else if (event.key === ' ' && !event.repeat) {
        event.preventDefault()
        if (!temporaryToolRef.current) {
          temporaryToolRef.current = activeToolId
          handleToolSelect('hand')
        }
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
      }

      if (event.key !== ' ' || !temporaryToolRef.current) {
        return
      }

      const previousTool = temporaryToolRef.current
      temporaryToolRef.current = null
      handleToolSelect(previousTool)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [activeEditorGlyphId, activeToolId, deleteSelectedNodes, fontData, getPreviousPenSelection, handleCopySelection, handlePasteSelection, handleRedo, handleToolSelect, handleUndo, selectedLayerId, selectedNodeIds, setSelectedNodeIds, setSelectedSegment, updateNodePositions])

  return (
    <Box position="relative" w="100%" h="100%" bg="white" overflow="hidden">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'default',
        }}
      />

      <HiddenTextInput
        activeToolId={activeToolId}
        compositionOverlayStyle={compositionOverlayStyle}
        compositionText={compositionText}
        inputRef={hiddenTextInputRef}
        textInputValue={textInputValue}
        onChange={(event) => {
          setDraftTextInputValue(event.target.value)
          if (!isComposingText) {
            commitTextInputValue(event.target.value, event.target.selectionStart)
          }
        }}
        onCompositionEnd={(event) => {
          setIsComposingText(false)
          setCompositionText('')
          setDraftTextInputValue(event.currentTarget.value)
          commitTextInputValue(event.currentTarget.value, event.currentTarget.selectionStart)
        }}
        onCompositionStart={() => {
          setDraftTextInputValue(textInputValue)
          setIsComposingText(true)
        }}
        onCompositionUpdate={(event) => {
          setCompositionText(event.data)
        }}
        onSelect={(event) => {
          if (activeToolId !== 'text') {
            return
          }
          const target = event.target as HTMLTextAreaElement
          const cursorIndex = codeUnitIndexToCharIndex(
            target.value,
            target.selectionStart ?? target.value.length
          )
          setEditorTextCursorIndex(cursorIndex)
          if (editorGlyphIds.length > 0) {
            setEditorActiveGlyphIndex(
              Math.max(0, Math.min(cursorIndex - 1, editorGlyphIds.length - 1))
            )
          }
        }}
      />

      <CanvasWorkspaceOverlay
        activeToolId={activeToolId}
        canRedo={futureStatesLength > 0}
        canUndo={pastStatesLength > 0}
        onRedo={handleRedo}
        onSelectTool={handleToolSelect}
        onUndo={handleUndo}
      />
    </Box>
  )
}
