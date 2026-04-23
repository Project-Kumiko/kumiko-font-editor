import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import {
  buildGlyphPreviewData,
  getGlyphDisplayCharacter,
} from '../../lib/glyphOverview'
import type { GlyphData } from '../../store'

const GlyphPreview = memo(function GlyphPreview({
  glyph,
  glyphMap,
}: {
  glyph: GlyphData
  glyphMap: Record<string, GlyphData>
}) {
  const preview = useMemo(
    () => buildGlyphPreviewData(glyph, glyphMap),
    [glyph, glyphMap]
  )
  const displayCharacter =
    getGlyphDisplayCharacter(glyph) ?? glyph.name ?? glyph

  if (!preview.shapes.length) {
    return (
      <Flex w="100%" h="100%" align="center" justify="center">
        <Text
          w="100%"
          textAlign="center"
          fontSize={displayCharacter.length > 1 ? 'sm' : '6xl'}
          fontWeight="900"
          color="field.haze"
          lineHeight={1}
          userSelect="none"
        >
          {displayCharacter}
        </Text>
      </Flex>
    )
  }

  return (
    <Box
      as="svg"
      viewBox={preview.viewBox}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform="matrix(1 0 0 -1 0 800)">
        {preview.shapes.map((shape, index) => (
          <path
            key={`${glyph.id}-shape-${index}`}
            d={shape.d}
            transform={shape.transform}
            fill="currentColor"
            stroke="none"
          />
        ))}
      </g>
    </Box>
  )
})

interface GlyphCardProps {
  glyph: GlyphData
  glyphMap: Record<string, GlyphData>
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
}

export const GlyphCard = memo(function GlyphCard({
  glyph,
  glyphMap,
  isSelected,
  onClick,
  onDoubleClick,
}: GlyphCardProps) {
  return (
    <Box
      p={1}
      h="140px"
      borderRadius="sm"
      bg={isSelected ? 'field.yellow.300' : 'field.panel'}
      boxShadow="none"
      transition="all 140ms ease"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <Stack spacing={1} h="100%">
        <Flex align="center" justify="center" h="104px" borderRadius="sm">
          <Box w="100%" h="100%">
            <GlyphPreview glyph={glyph} glyphMap={glyphMap} />
          </Box>
        </Flex>

        <Text
          fontSize="xs"
          color="field.muted"
          noOfLines={1}
          textAlign="center"
          fontFamily="mono"
        >
          {glyph.id}
        </Text>
      </Stack>
    </Box>
  )
})
