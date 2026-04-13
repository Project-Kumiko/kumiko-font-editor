import { useEffect, useRef, type MutableRefObject } from 'react';
import { Box, Flex, Kbd, Text } from '@chakra-ui/react';
import paper from 'paper';
import { useStore, type FontData, type GlyphData, type ViewportState } from '../store';

type HandleBinding = {
  circle: paper.Path.Circle;
  segment: paper.Segment;
};

const GRID_STEP = 120;
const MAX_COMPONENT_DEPTH = 4;

const toCanvasPoint = (x: number, y: number) => new paper.Point(x, -y);

const applyViewport = (
  rootGroup: paper.Group,
  viewport: ViewportState,
  canvasSize: paper.Size,
) => {
  rootGroup.position = new paper.Point(
    canvasSize.width / 2 + viewport.pan.x,
    canvasSize.height / 2 + viewport.pan.y,
  );
  rootGroup.scaling = new paper.Point(viewport.zoom, viewport.zoom);
};

const renderGuides = (rootGroup: paper.Group) => {
  for (let x = -1200; x <= 1200; x += GRID_STEP) {
    const line = new paper.Path.Line({
      from: new paper.Point(x, -1100),
      to: new paper.Point(x, 1100),
      strokeColor: x === 0 ? new paper.Color('#8ba2b8') : new paper.Color(1, 1, 1, 0.08),
      strokeWidth: x === 0 ? 1.6 : 0.6,
      dashArray: x === 0 ? undefined : [6, 8],
      guide: true,
    });
    rootGroup.addChild(line);
  }

  for (let y = -1100; y <= 1100; y += GRID_STEP) {
    const line = new paper.Path.Line({
      from: new paper.Point(-1200, y),
      to: new paper.Point(1200, y),
      strokeColor: y === 0 ? new paper.Color('#8ba2b8') : new paper.Color(1, 1, 1, 0.08),
      strokeWidth: y === 0 ? 1.6 : 0.6,
      dashArray: y === 0 ? undefined : [6, 8],
      guide: true,
    });
    rootGroup.addChild(line);
  }
};

const renderMetrics = (glyph: GlyphData, rootGroup: paper.Group) => {
  const { lsb, width } = glyph.metrics;

  [
    { x: 0, color: '#f6ad55' },
    { x: lsb, color: '#63b3ed' },
    { x: width, color: '#68d391' },
  ].forEach(({ x, color }) => {
    const guide = new paper.Path.Line({
      from: new paper.Point(x, -980),
      to: new paper.Point(x, 980),
      strokeColor: new paper.Color(color),
      strokeWidth: 1.2,
      dashArray: [12, 10],
      opacity: 0.82,
    });
    rootGroup.addChild(guide);
  });
};

const renderGlyphPaths = (
  glyph: GlyphData,
  rootGroup: paper.Group,
  handleBindings: Map<string, HandleBinding>,
  selectedHandleIds: Set<string>,
  showHandles: boolean,
  matrix?: paper.Matrix,
) => {
  glyph.paths.forEach((pathData) => {
    const path = new paper.Path({
      closed: pathData.closed,
      strokeColor: new paper.Color('#f8fafc'),
      strokeWidth: 2,
      strokeCap: 'round',
      strokeJoin: 'round',
      fillColor: pathData.closed ? new paper.Color(0.35, 0.77, 0.95, 0.08) : undefined,
    });

    path.data = { pathId: pathData.id };
    pathData.nodes.forEach((node) => {
      const point = matrix ? matrix.transform(toCanvasPoint(node.x, node.y)) : toCanvasPoint(node.x, node.y);
      const segment = new paper.Segment(point);
      path.add(segment);
    });
    rootGroup.addChild(path);

    if (!showHandles) {
      return;
    }

    pathData.nodes.forEach((node, index) => {
      const point = path.segments[index].point;
      const nodeKey = `${pathData.id}:${node.id}`;
      const isSelected = selectedHandleIds.has(nodeKey);
      const circle = new paper.Path.Circle({
        center: point,
        radius: 9,
        fillColor: isSelected ? new paper.Color('#f6ad55') : new paper.Color('#f8fafc'),
        strokeColor: node.type === 'smooth' ? new paper.Color('#90cdf4') : new paper.Color('#1a202c'),
        strokeWidth: 2,
      });

      circle.data = { pathId: pathData.id, nodeId: node.id };
      rootGroup.addChild(circle);
      handleBindings.set(nodeKey, { circle, segment: path.segments[index] });
    });
  });
};

const renderComponentRefs = (
  glyphId: string,
  fontData: FontData,
  rootGroup: paper.Group,
  depth: number,
) => {
  if (depth > MAX_COMPONENT_DEPTH) {
    return;
  }

  const glyph = fontData.glyphs[glyphId];
  if (!glyph) {
    return;
  }

  glyph.componentRefs.forEach((component) => {
    const referencedGlyph = fontData.glyphs[component.glyphId];
    if (!referencedGlyph) {
      return;
    }

    const componentMatrix = new paper.Matrix();
    componentMatrix.translate(component.x, -component.y);
    componentMatrix.rotate(-component.rotation, new paper.Point(0, 0));
    componentMatrix.scale(component.scaleX, component.scaleY);

    renderGlyphPaths(referencedGlyph, rootGroup, new Map(), new Set(), false, componentMatrix);
    renderComponentRefs(component.glyphId, fontData, rootGroup, depth + 1);
  });
};

const drawScene = (
  fontData: FontData | null,
  selectedGlyphId: string | null,
  selectedNodeIds: string[],
  viewport: ViewportState,
  rootGroupRef: MutableRefObject<paper.Group | null>,
  handleBindingsRef: MutableRefObject<Map<string, HandleBinding>>,
) => {
  if (!paper.project || !paper.view) {
    return;
  }

  paper.project.activeLayer.removeChildren();
  const rootGroup = new paper.Group();
  rootGroupRef.current = rootGroup;
  handleBindingsRef.current = new Map();

  renderGuides(rootGroup);

  if (!fontData || !selectedGlyphId) {
    applyViewport(rootGroup, viewport, paper.view.size);
    paper.view.update();
    return;
  }

  const glyph = fontData.glyphs[selectedGlyphId];
  if (!glyph) {
    applyViewport(rootGroup, viewport, paper.view.size);
    paper.view.update();
    return;
  }

  renderMetrics(glyph, rootGroup);
  renderComponentRefs(selectedGlyphId, fontData, rootGroup, 0);
  renderGlyphPaths(
    glyph,
    rootGroup,
    handleBindingsRef.current,
    new Set(selectedNodeIds),
    true,
  );

  applyViewport(rootGroup, viewport, paper.view.size);
  paper.view.update();
};

export function CanvasWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootGroupRef = useRef<paper.Group | null>(null);
  const handleBindingsRef = useRef<Map<string, HandleBinding>>(new Map());
  const dragStateRef = useRef<{
    activeHandleId: string | null;
    isPanning: boolean;
    didMove: boolean;
    startPan: { x: number; y: number };
  }>({
    activeHandleId: null,
    isPanning: false,
    didMove: false,
    startPan: { x: 0, y: 0 },
  });

  const fontData = useStore((state) => state.fontData);
  const selectedGlyphId = useStore((state) => state.selectedGlyphId);
  const selectedNodeIds = useStore((state) => state.selectedNodeIds);
  const viewport = useStore((state) => state.viewport);
  const setSelectedNodeIds = useStore((state) => state.setSelectedNodeIds);
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const updateViewport = useStore((state) => state.updateViewport);

  useEffect(() => {
    if (!canvasRef.current || paper.project) {
      return;
    }

    const canvasElement = canvasRef.current;
    paper.setup(canvasElement);

    const tool = new paper.Tool();
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const currentViewport = useStore.getState().viewport;
      const scaleFactor = event.deltaY < 0 ? 1.12 : 0.9;
      updateViewport(currentViewport.zoom * scaleFactor, currentViewport.pan.x, currentViewport.pan.y);
    };

    tool.onMouseDown = (event: paper.ToolEvent) => {
      const dragState = dragStateRef.current;
      dragState.didMove = false;
      dragState.activeHandleId = null;
      dragState.isPanning = false;
      dragState.startPan = useStore.getState().viewport.pan;

      const hitResult = paper.project?.hitTest(event.point, {
        fill: true,
        stroke: true,
        tolerance: 10,
      });

      const pathId = hitResult?.item?.data?.pathId as string | undefined;
      const nodeId = hitResult?.item?.data?.nodeId as string | undefined;

      if (pathId && nodeId) {
        const handleId = `${pathId}:${nodeId}`;
        dragState.activeHandleId = handleId;
        setSelectedNodeIds([handleId]);
        return;
      }

      dragState.isPanning = true;
      setSelectedNodeIds([]);
    };

    tool.onMouseDrag = (event: paper.ToolEvent) => {
      const dragState = dragStateRef.current;
      dragState.didMove = true;

      if (dragState.activeHandleId) {
        const rootGroup = rootGroupRef.current;
        const binding = handleBindingsRef.current.get(dragState.activeHandleId);
        if (!rootGroup || !binding) {
          return;
        }

        const localPoint = rootGroup.globalToLocal(event.point);
        binding.circle.position = localPoint;
        binding.segment.point = localPoint;
        paper.view.update();
        return;
      }

      if (dragState.isPanning) {
        const nextPanX = dragState.startPan.x + event.point.x - event.downPoint.x;
        const nextPanY = dragState.startPan.y + event.point.y - event.downPoint.y;
        updateViewport(useStore.getState().viewport.zoom, nextPanX, nextPanY);
      }
    };

    tool.onMouseUp = () => {
      const dragState = dragStateRef.current;

      if (dragState.activeHandleId && selectedGlyphId) {
        const [pathId, nodeId] = dragState.activeHandleId.split(':');
        const binding = handleBindingsRef.current.get(dragState.activeHandleId);
        if (binding) {
          updateNodePosition(selectedGlyphId, pathId, nodeId, {
            x: binding.segment.point.x,
            y: -binding.segment.point.y,
          });
        }
      }

      dragState.activeHandleId = null;
      dragState.isPanning = false;
      dragState.didMove = false;
    };

    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    tool.activate();

    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
      tool.remove();
      paper.project?.remove();
    };
  }, [selectedGlyphId, setSelectedNodeIds, updateNodePosition, updateViewport]);

  useEffect(() => {
    if (!paper.view) {
      return;
    }

    drawScene(
      fontData,
      selectedGlyphId,
      selectedNodeIds,
      viewport,
      rootGroupRef,
      handleBindingsRef,
    );
  }, [fontData, selectedGlyphId, selectedNodeIds, viewport]);

  return (
    <Box position="relative" w="100%" h="100%" bg="#111827" overflow="hidden">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        data-paper-resize="true"
      />
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
          拖曳節點即時預覽，放開後才寫回 Store
        </Text>
        <Text fontSize="xs" color="whiteAlpha.700">
          滾輪縮放，拖曳空白區平移視角
        </Text>
        <Text fontSize="xs" color="whiteAlpha.700">
          畫布採字體座標系，內部會自動轉成 Canvas 的 Y 軸朝下
        </Text>
      </Flex>
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
        <Kbd bg="whiteAlpha.200" color="white">Wheel</Kbd>
        <Text>Zoom</Text>
        <Kbd bg="whiteAlpha.200" color="white">Drag</Kbd>
        <Text>Pan / Move Node</Text>
      </Flex>
    </Box>
  );
}
