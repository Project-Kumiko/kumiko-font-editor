import { memo, forwardRef, useEffect, useMemo, useRef, type HTMLAttributes } from 'react'
import {
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Select,
  Stack,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react'
import { VirtuosoGrid, type GridStateSnapshot, type ListRange, type VirtuosoGridHandle } from 'react-virtuoso'
import { useStore, type GlyphData } from '../store'
import {
  getGlyphBlockLabel,
  getGlyphOverviewSections,
  getGlyphScriptLabel,
  buildGlyphPreviewData,
  type OverviewGroupBy,
} from '../lib/glyphOverview'
import { RightPanel } from './RightPanel'

const GlyphPreview = memo(function GlyphPreview({
  glyph,
  glyphMap,
}: {
  glyph: GlyphData
  glyphMap: Record<string, GlyphData>
}) {
  const preview = useMemo(() => buildGlyphPreviewData(glyph, glyphMap), [glyph, glyphMap])

  if (!preview.shapes.length) {
    return (
      <Text
        fontSize="4xl"
        fontWeight="medium"
        color="gray.800"
        lineHeight={1}
        userSelect="none"
      >
        {glyph.name}
      </Text>
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

const GlyphCard = memo(function GlyphCard({
  glyph,
  glyphMap,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  glyph: GlyphData
  glyphMap: Record<string, GlyphData>
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
}) {
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

export function FontOverviewScreen() {
  const currentSearchQuery = useStore((state) => state.currentSearchQuery)
  const setSearchQuery = useStore((state) => state.setSearchQuery)
  const filteredGlyphList = useStore((state) => state.filteredGlyphList)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const setSelectedGlyphId = useStore((state) => state.setSelectedGlyphId)
  const setWorkspaceView = useStore((state) => state.setWorkspaceView)
  const closeProjectState = useStore((state) => state.closeProjectState)
  const projectTitle = useStore((state) => state.projectTitle)
  const fontData = useStore((state) => state.fontData)

  const groupBy = useStore((state) => state.overviewGroupBy) as OverviewGroupBy
  const setOverviewGrouping = useStore((state) => state.setOverviewGrouping)
  const selectedSectionId = useStore((state) => state.overviewSectionId)
  const setOverviewSectionId = useStore((state) => state.setOverviewSectionId)
  const overviewGridState = useStore((state) => state.overviewGridState) as GridStateSnapshot | null
  const setOverviewGridState = useStore((state) => state.setOverviewGridState)
  const gridRef = useRef<VirtuosoGridHandle | null>(null)
  const restoreSnapshotRef = useRef<GridStateSnapshot | null>(overviewGridState)

  const sections = useMemo(
    () => getGlyphOverviewSections(filteredGlyphList, groupBy),
    [filteredGlyphList, groupBy]
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
        glyphs: filteredGlyphList,
      }
    }

    return (
      sections.find((section) => section.id === selectedSectionId) ?? {
        id: 'all',
        label: '全部字符',
        glyphs: filteredGlyphList,
      }
    )
  }, [filteredGlyphList, groupBy, sections, selectedSectionId])

  useEffect(() => {
    if (selectedSectionId !== 'all' && !sections.some((section) => section.id === selectedSectionId)) {
      setOverviewSectionId('all')
    }
  }, [sections, selectedSectionId, setOverviewSectionId])

  useEffect(() => {
    restoreSnapshotRef.current = overviewGridState
  }, [overviewGridState])

  const selectedGlyph = filteredGlyphList.find((glyph) => glyph.id === selectedGlyphId) ?? null
  const glyphMap = fontData?.glyphs ?? {}

  return (
    <Grid
      templateColumns="280px minmax(0, 1fr) 320px"
      templateAreas={`"left center right"`}
      h="100vh"
      w="100vw"
      overflow="hidden"
      bg="#eef2f7"
    >
      <GridItem area="left" minW={0} minH={0}>
        <Box
          p={4}
          h="100%"
          display="flex"
          flexDirection="column"
          bg="#f7faf8"
          borderRight="1px solid"
          borderColor="blackAlpha.200"
        >
          <VStack align="stretch" spacing={3} mb={4}>
            <HStack justify="space-between" align="flex-start">
              <Box>
                <Text
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="0.16em"
                  color="gray.500"
                  mb={1}
                >
                  Kumiko Font Editor
                </Text>
                <Heading size="md" color="gray.800">
                  所有字符
                </Heading>
                <Text fontSize="sm" color="gray.500" mt={1} noOfLines={2}>
                  {projectTitle}
                </Text>
              </Box>
              <Button size="sm" variant="ghost" onClick={closeProjectState}>
                ⬅︎ 首頁
              </Button>
            </HStack>

            <Input
              placeholder="搜尋字符、glyph name 或 unicode"
              value={currentSearchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              bg="white"
              borderColor="blackAlpha.200"
              focusBorderColor="teal.400"
            />

            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Grouping
              </Text>
              <Select
                size="sm"
                bg="white"
                value={groupBy}
                onChange={(event) => {
                  setOverviewGrouping(event.target.value as OverviewGroupBy)
                  setOverviewSectionId('all')
                }}
              >
                <option value="script">語系 / Script</option>
                <option value="block">Unicode Block</option>
                <option value="none">不分組</option>
              </Select>
            </Box>

            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                目前共 {filteredGlyphList.length.toLocaleString()} 個字符
              </Text>
              <Tag size="sm" colorScheme="teal" variant="subtle">
                Overview
              </Tag>
            </HStack>
          </VStack>

          <Divider mb={4} />

          <Box
            flex={1}
            minH={0}
            bg="white"
            borderRadius="xl"
            border="1px solid"
            borderColor="blackAlpha.100"
            overflow="auto"
            p={2}
          >
            <VStack align="stretch" spacing={1}>
              <Button
                justifyContent="space-between"
                variant={selectedSectionId === 'all' ? 'solid' : 'ghost'}
                colorScheme={selectedSectionId === 'all' ? 'teal' : undefined}
                onClick={() => setOverviewSectionId('all')}
              >
                <Text>全部</Text>
                <Tag size="sm">{filteredGlyphList.length}</Tag>
              </Button>

              {sections.map((section) => (
                <Button
                  key={section.id}
                  justifyContent="space-between"
                  variant={selectedSectionId === section.id ? 'solid' : 'ghost'}
                  colorScheme={selectedSectionId === section.id ? 'teal' : undefined}
                  onClick={() => {
                    setOverviewSectionId(section.id)
                    if (!selectedGlyph || !section.glyphs.some((glyph) => glyph.id === selectedGlyph.id)) {
                      setSelectedGlyphId(section.glyphs[0]?.id ?? null)
                    }
                  }}
                >
                  <Text noOfLines={1}>{section.label}</Text>
                  <Tag size="sm">{section.glyphs.length}</Tag>
                </Button>
              ))}
            </VStack>
          </Box>
        </Box>
      </GridItem>

      <GridItem area="center" minW={0} minH={0}>
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
                h="calc(100vh - 172px)"
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
                    restoreStateFrom={restoreSnapshotRef.current}
                    stateChanged={(state) => {
                      setOverviewGridState(state)
                      restoreSnapshotRef.current = null
                    }}
                    rangeChanged={(_range: ListRange) => {
                      restoreSnapshotRef.current = null
                    }}
                    components={{
                      List: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
                        function OverviewGridList(props, ref) {
                          return <Box ref={ref} display="grid" gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3} {...props} />
                        }
                      ),
                      Item: (props) => <Box {...props} />,
                    }}
                    itemContent={(index) => {
                      const glyph = activeSection.glyphs[index]
                      return (
                        <GlyphCard
                          glyph={glyph}
                          glyphMap={glyphMap}
                          isSelected={glyph.id === selectedGlyphId}
                          onClick={() => setSelectedGlyphId(glyph.id)}
                          onDoubleClick={() => {
                            setSelectedGlyphId(glyph.id)
                            setWorkspaceView('editor')
                          }}
                        />
                      )
                    }}
                  />
                </Box>
              </Box>
            )}
          </Stack>
        </Box>
      </GridItem>

      <GridItem area="right" minW={0} minH={0}>
        <RightPanel />
      </GridItem>
    </Grid>
  )
}

export const getOverviewGlyphMeta = (glyph: GlyphData) => ({
  script: getGlyphScriptLabel(glyph),
  block: getGlyphBlockLabel(glyph),
})
