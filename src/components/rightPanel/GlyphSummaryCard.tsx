import {
  Box,
  Button,
  Grid,
  GridItem,
  Select,
  Stack,
  Tag,
  Text,
} from '@chakra-ui/react'
import {
  getGlyphBlockLabel,
  getGlyphDisplayCharacter,
  getGlyphOverviewStats,
  getGlyphScriptLabel,
} from '../../lib/glyphOverview'
import type { GlyphData, GlyphLayerData, WorkspaceView } from '../../store'

interface GlyphSummaryCardProps {
  activeLayer: GlyphLayerData | null
  availableLayers: Array<{ id: string; name: string }>
  glyph: GlyphData
  isDirty: boolean
  selectedLayerId: string | null
  workspaceView: WorkspaceView
  onDeleteGlyph: () => void
  onEnterEditor: () => void
  onLayerChange: (layerId: string) => void
}

export function GlyphSummaryCard({
  activeLayer,
  availableLayers,
  glyph,
  isDirty,
  selectedLayerId,
  workspaceView,
  onDeleteGlyph,
  onEnterEditor,
  onLayerChange,
}: GlyphSummaryCardProps) {
  const overviewStats = getGlyphOverviewStats(glyph)
  const glyphDisplayCharacter = getGlyphDisplayCharacter(glyph)

  return (
    <Box
      p={4}
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="blackAlpha.100"
    >
      <Stack spacing={2}>
        <Text fontWeight="bold" color="gray.800">
          {glyph.name}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {glyph.id}
        </Text>
        {workspaceView === 'overview' && (
          <Box
            mt={1}
            px={3}
            py={4}
            borderRadius="lg"
            border="1px solid"
            borderColor="blackAlpha.100"
            bg="gray.50"
            textAlign="center"
          >
            <Text
              fontSize={glyphDisplayCharacter ? '5xl' : 'xl'}
              lineHeight={1}
              color="gray.800"
            >
              {glyphDisplayCharacter ?? glyph.name}
            </Text>
          </Box>
        )}
        <Stack direction="row" spacing={2} align="center">
          <Tag alignSelf="start" colorScheme="cyan" variant="subtle">
            Layer {selectedLayerId ?? activeLayer?.id ?? 'default'}
          </Tag>
          <Tag
            alignSelf="start"
            colorScheme={isDirty ? 'orange' : 'green'}
            variant="subtle"
          >
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
              onChange={(event) => onLayerChange(event.target.value)}
            >
              {availableLayers.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.name || layer.id}
                </option>
              ))}
            </Select>
          </Box>
        )}
        {workspaceView === 'overview' && (
          <>
            <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={2}>
              <GridItem>
                <Text fontSize="xs" color="gray.500">
                  Unicode
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {glyph.unicode ?? '未編碼'}
                </Text>
              </GridItem>
              <GridItem>
                <Text fontSize="xs" color="gray.500">
                  Script
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {getGlyphScriptLabel(glyph)}
                </Text>
              </GridItem>
              <GridItem>
                <Text fontSize="xs" color="gray.500">
                  Block
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {getGlyphBlockLabel(glyph)}
                </Text>
              </GridItem>
              <GridItem>
                <Text fontSize="xs" color="gray.500">
                  Contours / Components
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {overviewStats?.contourCount ?? 0} /{' '}
                  {overviewStats?.componentCount ?? 0}
                </Text>
              </GridItem>
            </Grid>
            <Button size="sm" colorScheme="teal" onClick={onEnterEditor}>
              進入字符編輯器
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              onClick={onDeleteGlyph}
            >
              刪除字符
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}
