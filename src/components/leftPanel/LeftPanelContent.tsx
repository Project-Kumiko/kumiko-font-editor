import { Divider, HStack, Stack, Tag, Text, VStack } from '@chakra-ui/react'
import type { GlyphData } from '../../store'
import { ComponentSearchSection } from './ComponentSearchSection'
import { GlyphPreviewCard } from './GlyphPreviewCard'
import { GlyphPreviewStrip } from './GlyphPreviewStrip'
import { LeftPanelHeader } from './LeftPanelHeader'
import { useGlyphReferenceSearch } from './useGlyphReferenceSearch'

interface LeftPanelContentProps {
  glyphMap: Record<string, GlyphData>
  glyphs: GlyphData[]
  selectedGlyph: GlyphData | null
  onAddGlyphToEditor: (glyphId: string) => void
  onBack: () => void
}

export function LeftPanelContent({
  glyphMap,
  glyphs,
  selectedGlyph,
  onAddGlyphToEditor,
  onBack,
}: LeftPanelContentProps) {
  const {
    isCjkGlyph,
    loading,
    previewGlyph,
    resultGlyphs,
    searchState,
    selectedComponent,
    setPreviewGlyphId,
    setSelectedComponent,
  } = useGlyphReferenceSearch({
    glyphs,
    glyphMap,
    selectedGlyph,
  })

  return (
    <>
      <VStack align="stretch" spacing={3} mb={4}>
        <LeftPanelHeader
          hasSelectedGlyph={Boolean(selectedGlyph)}
          isCjkGlyph={isCjkGlyph}
          onBack={onBack}
        />

        {isCjkGlyph && selectedGlyph ? (
          <ComponentSearchSection
            components={searchState.components}
            loading={loading}
            selectedComponent={selectedComponent ?? searchState.activeComponent}
            onSelectComponent={setSelectedComponent}
          />
        ) : null}

        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="gray.600">
            {isCjkGlyph ? '含此部件的字符' : '相關字符'}{' '}
            {resultGlyphs.length.toLocaleString()}
          </Text>
          <Tag size="sm" colorScheme="teal" variant="subtle">
            {isCjkGlyph ? 'Worker' : 'Related'}
          </Tag>
        </HStack>
      </VStack>

      <Divider mb={4} />

      <Stack height="100%" minH={0} spacing={3}>
        <GlyphPreviewStrip
          glyphMap={glyphMap}
          previewGlyphId={previewGlyph?.id ?? null}
          resultGlyphs={resultGlyphs}
          onPreviewGlyphChange={setPreviewGlyphId}
        />

        <GlyphPreviewCard
          glyph={previewGlyph}
          glyphMap={glyphMap}
          onAddToEditor={onAddGlyphToEditor}
        />
      </Stack>

      {searchState.error ? (
        <Text mt={3} fontSize="sm" color="red.500">
          {searchState.error}
        </Text>
      ) : null}
    </>
  )
}
