import {
  getArchivedGlyphLayerEntries,
  getProjectArchiveMetadata,
  getProjectArchiveSourceFormat,
  hydrateProjectFontData,
} from '../lib/projectArchive';
import {
  Box,
  Button,
  Divider,
  Grid,
  GridItem,
  Heading,
  Input,
  Select,
  Stack,
  Tag,
  Text,
  useToast,
} from '@chakra-ui/react';
import { CornerNodeIcon, SmoothNodeIcon } from '../icons';
import { saveProject } from '../lib/persistence';
import { deterministicStringify, getEffectiveNodeType, getGlyphLayer, isPathEndpointNode, useStore, type NodeType } from '../store';

const parseSelectedNode = (selectedNodeId: string | undefined) => {
  if (!selectedNodeId) {
    return null;
  }

  const [pathId, nodeId] = selectedNodeId.split(':');
  if (!pathId || !nodeId) {
    return null;
  }

  return { pathId, nodeId };
};

const parseNumberInput = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function RightPanel() {
  const toast = useToast();
  const selectedGlyphId = useStore((state) => state.selectedGlyphId);
  const selectedLayerId = useStore((state) => state.selectedLayerId);
  const selectedNodeIds = useStore((state) => state.selectedNodeIds);
  const selectedSegment = useStore((state) => state.selectedSegment);
  const fontData = useStore((state) => state.fontData);
  const projectId = useStore((state) => state.projectId);
  const projectTitle = useStore((state) => state.projectTitle);
  const isDirty = useStore((state) => state.isDirty);
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const updateNodeType = useStore((state) => state.updateNodeType);
  const updateGlyphMetrics = useStore((state) => state.updateGlyphMetrics);
  const convertLineSegmentToCurve = useStore((state) => state.convertLineSegmentToCurve);
  const setSelectedLayerId = useStore((state) => state.setSelectedLayerId);
  const markProjectSaved = useStore((state) => state.markProjectSaved);

  const glyph = selectedGlyphId && fontData ? fontData.glyphs[selectedGlyphId] : null;
  const activeLayer = getGlyphLayer(glyph ?? undefined, selectedLayerId);
  const availableLayers = glyph ? getArchivedGlyphLayerEntries(glyph.id) : [];
  const nodeRef = parseSelectedNode(selectedNodeIds[0]);
  const selectedPath = activeLayer && nodeRef ? activeLayer.paths.find((path) => path.id === nodeRef.pathId) : null;
  const selectedNode = selectedPath && nodeRef ? selectedPath.nodes.find((node) => node.id === nodeRef.nodeId) : null;
  const effectiveNodeType = selectedPath && selectedNode ? getEffectiveNodeType(selectedPath, selectedNode) : undefined;
  const isOnCurveNode = effectiveNodeType === 'corner' || effectiveNodeType === 'smooth';
  const isEndpointNode = selectedPath && selectedNode ? isPathEndpointNode(selectedPath, selectedNode.id) : false;

  const handleCoordinateChange = (axis: 'x' | 'y', value: string) => {
    if (!glyph || !nodeRef || !selectedNode) {
      return;
    }

    updateNodePosition(glyph.id, nodeRef.pathId, nodeRef.nodeId, {
      x: axis === 'x' ? parseNumberInput(value) : selectedNode.x,
      y: axis === 'y' ? parseNumberInput(value) : selectedNode.y,
    });
  };

  const handleNodeTypeChange = (type: NodeType) => {
    if (!glyph || !nodeRef) {
      return;
    }

    updateNodeType(glyph.id, nodeRef.pathId, nodeRef.nodeId, type);
  };

  const handleMetricsChange = (field: 'lsb' | 'rsb' | 'width', value: string) => {
    if (!glyph) {
      return;
    }

    updateGlyphMetrics(glyph.id, {
      [field]: parseNumberInput(value),
    });
  };

  const handleConvertSelectedSegment = () => {
    if (!glyph || !selectedSegment || selectedSegment.type !== 'line') {
      return;
    }

    convertLineSegmentToCurve(
      glyph.id,
      selectedSegment.pathId,
      selectedSegment.startNodeId,
      selectedSegment.endNodeId
    );
  };

  const handleManualExport = async () => {
    if (!fontData) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        deterministicStringify(hydrateProjectFontData(fontData))
      );
      toast({
        title: '已複製 deterministic JSON',
        description: '可直接貼到版本控制或匯出流程中。',
        status: 'success',
        duration: 2400,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '無法寫入剪貼簿',
        description: '瀏覽器拒絕了剪貼簿權限，請改用 devtools 取值。',
        status: 'warning',
        duration: 3200,
        isClosable: true,
      });
      console.warn('Clipboard export failed.', error);
    }
  };

  const handleSaveProject = async () => {
    if (!fontData || !projectId || !projectTitle) {
      return;
    }

    try {
      await saveProject({
        id: projectId,
        title: projectTitle,
        lastModified: Date.now(),
        fontData: hydrateProjectFontData(fontData),
        projectMetadata: getProjectArchiveMetadata(),
        projectSourceFormat: getProjectArchiveSourceFormat(),
      });
      markProjectSaved();
      toast({
        title: '已儲存專案',
        description: '目前變更已寫入本機草稿。',
        status: 'success',
        duration: 2200,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: '無法寫入本機草稿，請稍後再試。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      });
      console.warn('Manual project save failed.', error);
    }
  };

  return (
    <Box
      p={4}
      h="100%"
      overflowY="auto"
      bg="#fbfcfe"
      borderLeft="1px solid"
      borderColor="blackAlpha.200"
    >
      <Stack spacing={5}>
        <Box>
          <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color="gray.500" mb={1}>
            Module C
          </Text>
          <Heading size="md" color="gray.800">
            屬性與儲存
          </Heading>
        </Box>

        {!glyph ? (
          <Text fontSize="sm" color="gray.500">
            尚未選取字形。
          </Text>
        ) : (
          <Stack spacing={4}>
            <Box p={4} bg="white" borderRadius="xl" border="1px solid" borderColor="blackAlpha.100">
              <Stack spacing={2}>
                <Text fontWeight="bold" color="gray.800">
                  {glyph.name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {glyph.id}
                </Text>
                <Stack direction="row" spacing={2} align="center">
                  <Tag alignSelf="start" colorScheme="cyan" variant="subtle">
                    Layer {selectedLayerId ?? activeLayer?.id ?? 'default'}
                  </Tag>
                  <Tag alignSelf="start" colorScheme={isDirty ? 'orange' : 'green'} variant="subtle">
                    {isDirty ? '未儲存' : '已儲存'}
                  </Tag>
                </Stack>
                {availableLayers.length > 0 && (
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      圖層 / Master
                    </Text>
                    <Select
                      size="sm"
                      bg="white"
                      value={activeLayer?.id ?? ''}
                      onChange={(event) => setSelectedLayerId(event.target.value)}
                    >
                      {availableLayers.map((layer) => {
                        return (
                          <option key={layer.id} value={layer.id}>
                            {layer.name || layer.id}
                          </option>
                        );
                      })}
                    </Select>
                  </Box>
                )}
              </Stack>
            </Box>

            <Box p={4} bg="white" borderRadius="xl" border="1px solid" borderColor="blackAlpha.100">
              <Stack spacing={3}>
                <Heading size="sm">專案儲存</Heading>
                <Button
                  colorScheme="blue"
                  onClick={handleSaveProject}
                  isDisabled={!fontData || !projectId || !projectTitle || !isDirty}
                >
                  儲存目前專案
                </Button>
              </Stack>
            </Box>

            <Box p={4} bg="white" borderRadius="xl" border="1px solid" borderColor="blackAlpha.100">
              <Heading size="sm" mb={3}>
                節點檢視
              </Heading>
              {!selectedNode || !nodeRef ? (
                selectedSegment ? (
                  <Stack spacing={3}>
                    <Text fontSize="sm" color="gray.600">
                      Segment <Tag size="sm" ml={2}>{selectedSegment.pathId}</Tag>
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      目前高亮的是一段{selectedSegment.type === 'line' ? '直線' : '曲線'}。
                    </Text>
                    {selectedSegment.type === 'line' ? (
                      <Button size="sm" colorScheme="blue" onClick={handleConvertSelectedSegment}>
                        轉成曲線
                      </Button>
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        這段已經是曲線，不需要再轉換。
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    目前沒有選取節點。點擊畫布上的節點即可在這裡微調座標與節點類型。
                  </Text>
                )
              ) : (
                <Stack spacing={3}>
                  <Text fontSize="sm" color="gray.600">
                    Path <Tag size="sm" ml={2}>{nodeRef.pathId}</Tag>
                  </Text>

                  <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
                    <GridItem>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        X
                      </Text>
                      <Input
                        size="sm"
                        type="number"
                        value={selectedNode.x}
                        onChange={(event) => handleCoordinateChange('x', event.target.value)}
                      />
                    </GridItem>
                    <GridItem>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Y
                      </Text>
                      <Input
                        size="sm"
                        type="number"
                        value={selectedNode.y}
                        onChange={(event) => handleCoordinateChange('y', event.target.value)}
                      />
                    </GridItem>
                  </Grid>

                  {!isOnCurveNode ? (
                    <Text fontSize="sm" color="gray.500">
                      目前選到的是控制把手。把手本身沒有方形／圓形節點類型。
                    </Text>
                  ) : (
                    <Stack spacing={2}>
                      <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={2}>
                        <Button
                          size="sm"
                          variant={effectiveNodeType === 'corner' ? 'solid' : 'outline'}
                          colorScheme="orange"
                          onClick={() => handleNodeTypeChange('corner')}
                          leftIcon={<CornerNodeIcon />}
                        >
                          折線
                        </Button>
                        <Button
                          size="sm"
                          variant={effectiveNodeType === 'smooth' ? 'solid' : 'outline'}
                          colorScheme="blue"
                          onClick={() => handleNodeTypeChange('smooth')}
                          isDisabled={isEndpointNode}
                          leftIcon={<SmoothNodeIcon />}
                        >
                          平滑
                        </Button>
                      </Grid>
                      <Text fontSize="xs" color="gray.500">
                        {isEndpointNode
                          ? '開放路徑的起點與終點只有一根手把，所以固定為折線。'
                          : effectiveNodeType === 'smooth'
                            ? '平滑節點的兩根手把會連動，維持曲線方向。'
                            : '折線節點的兩根手把可分開移動，會視為折線轉折。'}
                      </Text>
                    </Stack>
                  )}
                </Stack>
              )}
            </Box>

            <Box p={4} bg="white" borderRadius="xl" border="1px solid" borderColor="blackAlpha.100">
              <Heading size="sm" mb={3}>
                Metrics
              </Heading>
              <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={3}>
                <GridItem>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    LSB
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    value={activeLayer?.metrics.lsb ?? glyph.metrics.lsb}
                    onChange={(event) => handleMetricsChange('lsb', event.target.value)}
                  />
                </GridItem>
                <GridItem>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    Width
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    value={activeLayer?.metrics.width ?? glyph.metrics.width}
                    onChange={(event) => handleMetricsChange('width', event.target.value)}
                  />
                </GridItem>
                <GridItem>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    RSB
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    value={activeLayer?.metrics.rsb ?? glyph.metrics.rsb}
                    onChange={(event) => handleMetricsChange('rsb', event.target.value)}
                  />
                </GridItem>
              </Grid>
            </Box>
          </Stack>
        )}

        <Divider />

        <Box p={4} bg="white" borderRadius="xl" border="1px solid" borderColor="blackAlpha.100">
          <Heading size="sm" mb={3}>
            儲存層
          </Heading>
          <Stack spacing={3}>
            <Text fontSize="sm" color="gray.600">
              目前會將 `fontData` 自動寫入 IndexedDB，避免大型 JSON 撐爆 LocalStorage。
            </Text>
            <Button size="sm" colorScheme="teal" onClick={handleManualExport}>
              複製 deterministic JSON
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
