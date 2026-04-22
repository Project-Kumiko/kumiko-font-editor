import { Box, Button, Text } from '@chakra-ui/react'
import type { GlyphData } from '../../store'
import { InlineGlyphPreview } from './InlineGlyphPreview'

interface GlyphPreviewStripProps {
  glyphMap: Record<string, GlyphData>
  previewGlyphId: string | null
  resultGlyphs: GlyphData[]
  onPreviewGlyphChange: (glyphId: string) => void
}

export function GlyphPreviewStrip({
  glyphMap,
  previewGlyphId,
  resultGlyphs,
  onPreviewGlyphChange,
}: GlyphPreviewStripProps) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="blackAlpha.100"
      px={3}
      py={3}
      minH="88px"
      flexShrink={1}
      overflow="scroll"
    >
      {resultGlyphs.length > 0 ? (
        <Box
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          alignContent="flex-start"
          columnGap={1}
          rowGap={1}
          lineHeight="1.2"
        >
          {resultGlyphs.map((glyph) => {
            const isActive = glyph.id === previewGlyphId
            return (
              <Button
                key={glyph.id}
                size="xs"
                variant="ghost"
                minW="unset"
                px={1.5}
                py={1}
                h="auto"
                color={isActive ? 'teal.700' : 'gray.800'}
                bg={isActive ? 'teal.50' : 'transparent'}
                _hover={{ bg: isActive ? 'teal.50' : 'gray.100' }}
                onClick={() => onPreviewGlyphChange(glyph.id)}
                title={glyph.id}
              >
                <InlineGlyphPreview glyph={glyph} glyphMap={glyphMap} />
              </Button>
            )
          })}
        </Box>
      ) : (
        <Text fontSize="sm" color="gray.500">
          目前沒有可顯示的字符。
        </Text>
      )}
    </Box>
  )
}
