import {
  Box,
  Button,
  Divider,
  Grid,
  GridItem,
  Heading,
  Input,
  Stack,
  Tag,
  Text,
  useToast,
} from '@chakra-ui/react';
import { deterministicStringify, useStore, type NodeType } from '../store';

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
  const selectedNodeIds = useStore((state) => state.selectedNodeIds);
  const fontData = useStore((state) => state.fontData);
  const updateNodePosition = useStore((state) => state.updateNodePosition);
  const updateNodeType = useStore((state) => state.updateNodeType);
  const updateGlyphMetrics = useStore((state) => state.updateGlyphMetrics);

  const glyph = selectedGlyphId && fontData ? fontData.glyphs[selectedGlyphId] : null;
  const nodeRef = parseSelectedNode(selectedNodeIds[0]);
  const selectedPath = glyph && nodeRef ? glyph.paths.find((path) => path.id === nodeRef.pathId) : null;
  const selectedNode = selectedPath && nodeRef ? selectedPath.nodes.find((node) => node.id === nodeRef.nodeId) : null;

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

  const handleManualExport = async () => {
    if (!fontData) {
      return;
    }

    try {
      await navigator.clipboard.writeText(deterministicStringify(fontData));
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
                <Tag alignSelf="start" colorScheme="cyan" variant="subtle">
                  Layer {useStore.getState().selectedLayerId}
                </Tag>
              </Stack>
            </Box>

            <Box p={4} bg="white" borderRadius="xl" border="1px solid" borderColor="blackAlpha.100">
              <Heading size="sm" mb={3}>
                節點檢視
              </Heading>
              {!selectedNode || !nodeRef ? (
                <Text fontSize="sm" color="gray.500">
                  目前沒有選取節點。點擊畫布上的節點即可在這裡微調座標與節點類型。
                </Text>
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

                  <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={2}>
                    <Button
                      size="sm"
                      variant={selectedNode.type === 'corner' ? 'solid' : 'outline'}
                      colorScheme="orange"
                      onClick={() => handleNodeTypeChange('corner')}
                    >
                      Corner
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedNode.type === 'smooth' ? 'solid' : 'outline'}
                      colorScheme="blue"
                      onClick={() => handleNodeTypeChange('smooth')}
                    >
                      Smooth
                    </Button>
                  </Grid>
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
                    value={glyph.metrics.lsb}
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
                    value={glyph.metrics.width}
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
                    value={glyph.metrics.rsb}
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
