import { Box } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useStore } from '../store'
import { LeftPanelContent } from './leftPanel/LeftPanelContent'

export function LeftPanel() {
  const fontData = useStore((state) => state.fontData)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const addGlyphToEditor = useStore((state) => state.addGlyphToEditor)
  const setWorkspaceView = useStore((state) => state.setWorkspaceView)

  const glyphs = useMemo(
    () => Object.values(fontData?.glyphs ?? {}),
    [fontData]
  )
  const glyphMap = useMemo(
    () => Object.fromEntries(glyphs.map((glyph) => [glyph.id, glyph])),
    [glyphs]
  )
  const selectedGlyph = selectedGlyphId
    ? (glyphMap[selectedGlyphId] ?? null)
    : null

  return (
    <Box
      p={4}
      h="100%"
      display="flex"
      flexDirection="column"
      bg="#f7faf8"
      borderRight="1px solid"
      borderColor="blackAlpha.200"
    >
      <LeftPanelContent
        key={selectedGlyph?.id ?? 'none'}
        glyphMap={glyphMap}
        glyphs={glyphs}
        selectedGlyph={selectedGlyph}
        onAddGlyphToEditor={addGlyphToEditor}
        onBack={() => setWorkspaceView('overview')}
      />
    </Box>
  )
}
