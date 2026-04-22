import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { GlyphReadonlyReference } from '../GlyphReadonlyReference'
import type { GlyphData } from '../../store'

interface GlyphPreviewCardProps {
  glyph: GlyphData | null
  glyphMap: Record<string, GlyphData>
  onAddToEditor: (glyphId: string) => void
}

export function GlyphPreviewCard({
  glyph,
  glyphMap,
  onAddToEditor,
}: GlyphPreviewCardProps) {
  if (!glyph) {
    return null
  }

  return (
    <Box flexShrink={0} minH={0}>
      <VStack align="stretch" spacing={2} h="100%">
        <HStack justify="space-between" align="center">
          <Box minW={0}>
            <Text fontSize="sm" color="gray.600">
              部件預覽
            </Text>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {glyph.id}
            </Text>
          </Box>
          <Button
            size="xs"
            colorScheme="teal"
            variant="outline"
            onClick={() => onAddToEditor(glyph.id)}
          >
            加入編輯器
          </Button>
        </HStack>
        <GlyphReadonlyReference glyph={glyph} glyphMap={glyphMap} />
      </VStack>
    </Box>
  )
}
