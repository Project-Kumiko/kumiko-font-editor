import { Grid, GridItem, useToast } from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GridStateSnapshot, VirtuosoGridHandle } from 'react-virtuoso'
import {
  getGlyphOverviewSections,
  type OverviewGroupBy,
} from '../../lib/glyphOverview'
import { useStore } from '../../store'
import { RightPanel } from '../common/glyphInspector/RightPanel'
import { OverviewContent } from './OverviewContent'
import { OverviewSidebar } from './OverviewSidebar'
import { parseGlyphAdditionInput } from './glyphInput'

export function FontOverviewScreen() {
  const toast = useToast()
  const [isAddingGlyphs, setIsAddingGlyphs] = useState(false)
  const [glyphInputValue, setGlyphInputValue] = useState('')
  const [showOnlyEmptyGlyphs, setShowOnlyEmptyGlyphs] = useState(false)
  const currentSearchQuery = useStore((state) => state.currentSearchQuery)
  const setSearchQuery = useStore((state) => state.setSearchQuery)
  const filteredGlyphList = useStore((state) => state.filteredGlyphList)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const setSelectedGlyphId = useStore((state) => state.setSelectedGlyphId)
  const addGlyphs = useStore((state) => state.addGlyphs)
  const setWorkspaceView = useStore((state) => state.setWorkspaceView)
  const closeProjectState = useStore((state) => state.closeProjectState)
  const projectTitle = useStore((state) => state.projectTitle)
  const fontData = useStore((state) => state.fontData)
  const groupBy = useStore((state) => state.overviewGroupBy) as OverviewGroupBy
  const setOverviewGrouping = useStore((state) => state.setOverviewGrouping)
  const selectedSectionId = useStore((state) => state.overviewSectionId)
  const setOverviewSectionId = useStore((state) => state.setOverviewSectionId)
  const overviewGridState = useStore(
    (state) => state.overviewGridState
  ) as GridStateSnapshot | null
  const setOverviewGridState = useStore((state) => state.setOverviewGridState)
  const gridRef = useRef<VirtuosoGridHandle | null>(null)

  const overviewGlyphs = useMemo(
    () =>
      showOnlyEmptyGlyphs
        ? filteredGlyphList.filter(
            (glyph) =>
              glyph.paths.length === 0 && glyph.componentRefs.length === 0
          )
        : filteredGlyphList,
    [filteredGlyphList, showOnlyEmptyGlyphs]
  )

  const sections = useMemo(
    () => getGlyphOverviewSections(overviewGlyphs, groupBy),
    [groupBy, overviewGlyphs]
  )

  const visibleSections = useMemo(() => {
    if (selectedSectionId === 'all') {
      return sections
    }
    return sections.filter((section) => section.id === selectedSectionId)
  }, [sections, selectedSectionId])

  const activeSection = useMemo(() => {
    if (selectedSectionId === 'all') {
      return {
        id: 'all',
        label: groupBy === 'none' ? '全部字符' : '全部分組結果',
        glyphs: overviewGlyphs,
      }
    }

    return (
      sections.find((section) => section.id === selectedSectionId) ?? {
        id: 'all',
        label: '全部字符',
        glyphs: overviewGlyphs,
      }
    )
  }, [groupBy, overviewGlyphs, sections, selectedSectionId])

  useEffect(() => {
    if (
      selectedSectionId !== 'all' &&
      !sections.some((section) => section.id === selectedSectionId)
    ) {
      setOverviewSectionId('all')
    }
  }, [sections, selectedSectionId, setOverviewSectionId])

  const selectedGlyph =
    overviewGlyphs.find((glyph) => glyph.id === selectedGlyphId) ?? null
  const glyphMap = fontData?.glyphs ?? {}

  const handleAddGlyphs = () => {
    const candidates = parseGlyphAdditionInput(glyphInputValue)
    if (candidates.length === 0) {
      toast({
        title: '沒有可新增的字符',
        description: '請輸入字符本身，或用空白分隔的 uniXXXX。',
        status: 'warning',
        duration: 2200,
        isClosable: true,
      })
      return
    }

    const existingGlyphIds = new Set(Object.keys(glyphMap))
    const missingCandidates = candidates.filter(
      (candidate) => !existingGlyphIds.has(candidate.id)
    )
    const addedGlyphIds = addGlyphs(missingCandidates)
    if (addedGlyphIds.length > 0) {
      setSelectedGlyphId(addedGlyphIds[0] ?? null)
      setGlyphInputValue('')
      setIsAddingGlyphs(false)
    }

    const skippedCount = candidates.length - addedGlyphIds.length
    toast({
      title: addedGlyphIds.length > 0 ? '已新增字符' : '沒有新增字符',
      description:
        addedGlyphIds.length > 0
          ? `新增 ${addedGlyphIds.length} 個字符${skippedCount > 0 ? `，略過 ${skippedCount} 個已存在字符` : ''}。`
          : '輸入的字符都已經存在於專案中。',
      status: addedGlyphIds.length > 0 ? 'success' : 'info',
      duration: 2600,
      isClosable: true,
    })
  }

  const handleSectionSelect = (sectionId: string) => {
    setOverviewSectionId(sectionId)
    if (sectionId === 'all') {
      return
    }

    const targetSection = sections.find((section) => section.id === sectionId)
    if (!targetSection) {
      return
    }

    if (
      !selectedGlyph ||
      !targetSection.glyphs.some((glyph) => glyph.id === selectedGlyph.id)
    ) {
      setSelectedGlyphId(targetSection.glyphs[0]?.id ?? null)
    }
  }

  const handleEnterEditor = (glyphId: string) => {
    setSelectedGlyphId(glyphId)
    setWorkspaceView('editor')
  }

  return (
    <Grid
      templateColumns="280px minmax(0, 1fr) 320px"
      templateAreas={`"left center right"`}
      h="100vh"
      w="100vw"
      overflow="hidden"
      bg="field.paper"
    >
      <GridItem area="left" minW={0} minH={0}>
        <OverviewSidebar
          currentSearchQuery={currentSearchQuery}
          groupBy={groupBy}
          glyphInputValue={glyphInputValue}
          isAddingGlyphs={isAddingGlyphs}
          overviewGlyphCount={overviewGlyphs.length}
          projectTitle={projectTitle}
          sections={sections}
          selectedSectionId={selectedSectionId}
          showOnlyEmptyGlyphs={showOnlyEmptyGlyphs}
          onCancelAddGlyphs={() => {
            setGlyphInputValue('')
            setIsAddingGlyphs(false)
          }}
          onCloseProject={closeProjectState}
          onGlyphInputChange={setGlyphInputValue}
          onGlyphInputSubmit={handleAddGlyphs}
          onGroupingChange={(value) => {
            setOverviewGrouping(value)
            setOverviewSectionId('all')
          }}
          onSearchQueryChange={setSearchQuery}
          onSectionSelect={handleSectionSelect}
          onShowOnlyEmptyGlyphsChange={setShowOnlyEmptyGlyphs}
          onToggleAddGlyphs={() => setIsAddingGlyphs(true)}
        />
      </GridItem>

      <GridItem area="center" minW={0} minH={0}>
        <OverviewContent
          activeSection={activeSection}
          glyphMap={glyphMap}
          gridRef={gridRef}
          restoreSnapshot={overviewGridState}
          selectedGlyphId={selectedGlyphId}
          visibleSections={visibleSections}
          onEnterEditor={handleEnterEditor}
          onGridStateChange={(state) => {
            setOverviewGridState(state)
          }}
          onRangeChange={() => {
            setOverviewGridState(null)
          }}
          onSelectGlyph={setSelectedGlyphId}
        />
      </GridItem>

      <GridItem area="right" minW={0} minH={0}>
        <RightPanel />
      </GridItem>
    </Grid>
  )
}
