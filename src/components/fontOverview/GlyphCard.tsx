import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { buildGlyphPreviewData, getGlyphDisplayCharacter } from '../../lib/glyphOverview'
import type { GlyphData } from '../../store'

const GlyphPreview = memo(function GlyphPreview({
  glyph,
  glyphMap,
}: {
  glyph: GlyphData
  glyphMap: Record<string, GlyphData>
}) {
  const preview = useMemo(() => buildGlyphPreviewData(glyph, glyphMap), [glyph, glyphMap])
  const displayCharacter = getGlyphDisplayCharacter(glyph)

  if (!preview.shapes.length) {
    return (
      <Flex w="100%" h="100%" align="center" justify="center">
        <Text
          w="100%"
          textAlign="center"
          fontSize="6xl"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontWeight="medium"
          color="gray.300"
          lineHeight={1}
          userSelect="none"
        >
          {displayCharacter ?? glyph.name ?? glyph.id}
        </Text>
      </Flex>
    )
  }

  return (
    <Box as="svg" viewBox={preview.viewBox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
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
      p={3}
      h="156px"
      borderRadius="xl"
      border="1px solid"
      borderColor={isSelected ? 'teal.300' : 'blackAlpha.100'}
      bg={isSelected ? 'teal.50' : 'white'}
      boxShadow={isSelected ? '0 8px 24px rgba(20, 184, 166, 0.15)' : 'sm'}
      cursor="pointer"
      transition="all 140ms ease"
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: 'md',
        borderColor: isSelected ? 'teal.400' : 'blackAlpha.200',
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <Stack spacing={3} h="100%">
        <Flex
          align="center"
          justify="center"
          h="104px"
          borderRadius="lg"
          bg="linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)"
          border="1px solid"
          borderColor="blackAlpha.100"
        >
          <Box w="100%" h="100%" color="gray.900" p={2}>
            <GlyphPreview glyph={glyph} glyphMap={glyphMap} />
          </Box>
        </Flex>

        <Text fontSize="xs" color="gray.500" noOfLines={1} textAlign="center">
          {glyph.id}
        </Text>
      </Stack>
    </Box>
  )
})
