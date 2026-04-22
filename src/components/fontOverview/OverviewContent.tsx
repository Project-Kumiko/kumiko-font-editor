import { Box, Heading, HStack, Stack, Tag, Text } from '@chakra-ui/react'
import {
  VirtuosoGrid,
  type GridStateSnapshot,
  type ListRange,
  type VirtuosoGridHandle,
} from 'react-virtuoso'
import { GlyphCard } from './GlyphCard'
import { OverviewGridItem, OverviewGridList } from './OverviewGridComponents'
import type { GlyphData } from '../../store'

interface OverviewSection {
  id: string
  label: string
  glyphs: GlyphData[]
}

interface OverviewContentProps {
  activeSection: OverviewSection
  glyphMap: Record<string, GlyphData>
  gridRef: React.RefObject<VirtuosoGridHandle | null>
  restoreSnapshot: GridStateSnapshot | null
  selectedGlyphId: string | null
  visibleSections: OverviewSection[]
  onEnterEditor: (glyphId: string) => void
  onGridStateChange: (state: GridStateSnapshot) => void
  onRangeChange: (_range: ListRange) => void
  onSelectGlyph: (glyphId: string) => void
}

export function OverviewContent({
  activeSection,
  glyphMap,
  gridRef,
  restoreSnapshot,
  selectedGlyphId,
  visibleSections,
  onEnterEditor,
  onGridStateChange,
  onRangeChange,
  onSelectGlyph,
}: OverviewContentProps) {
  return (
    <Box h="100%" overflow="auto" p={5}>
      <Stack spacing={5}>
        <Box>
          <Heading size="md" color="gray.800">
            字符總覽
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            單擊查看資訊，雙擊進入字符編輯器
          </Text>
        </Box>

        {visibleSections.length === 0 ? (
          <Box
            p={10}
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="blackAlpha.100"
          >
            <Text color="gray.500">目前沒有符合條件的字符。</Text>
          </Box>
        ) : (
          <Box
            p={4}
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="blackAlpha.100"
            boxShadow="sm"
            h="calc(100vh - 120px)"
            display="flex"
            flexDirection="column"
          >
            <HStack justify="space-between" mb={4}>
              <Heading size="sm" color="gray.800">
                {activeSection.label}
              </Heading>
              <Tag size="sm" colorScheme="gray" variant="subtle">
                {activeSection.glyphs.length}
              </Tag>
            </HStack>

            <Box flex={1} minH={0}>
              <VirtuosoGrid
                ref={gridRef}
                style={{ height: '100%', width: '100%' }}
                totalCount={activeSection.glyphs.length}
                restoreStateFrom={restoreSnapshot}
                stateChanged={onGridStateChange}
                rangeChanged={onRangeChange}
                increaseViewportBy={{ top: 1000, bottom: 1000 }}
                components={{
                  List: OverviewGridList,
                  Item: OverviewGridItem,
                }}
                itemContent={(index) => {
                  const glyph = activeSection.glyphs[index]
                  return (
                    <GlyphCard
                      glyph={glyph}
                      glyphMap={glyphMap}
                      isSelected={glyph.id === selectedGlyphId}
                      onClick={() => onSelectGlyph(glyph.id)}
                      onDoubleClick={() => onEnterEditor(glyph.id)}
                    />
                  )
                }}
              />
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
