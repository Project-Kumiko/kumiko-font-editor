import { memo, forwardRef, useEffect, useMemo, useRef, useState, type HTMLAttributes } from 'react'
import {
  Box,
  Button,
  Checkbox,
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
  useToast,
} from '@chakra-ui/react'
import { VirtuosoGrid, type GridStateSnapshot, type ListRange, type VirtuosoGridHandle } from 'react-virtuoso'
import { useStore, type GlyphData } from '../store'
import {
  getGlyphBlockLabel,
  getGlyphDisplayCharacter,
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

const formatUnicodeHex = (codePoint: number) =>
  codePoint <= 0xffff
    ? codePoint.toString(16).toUpperCase().padStart(4, '0')
    : codePoint.toString(16).toUpperCase()

const buildGlyphIdFromChar = (character: string) => {
  const codePoint = character.codePointAt(0)
  if (!codePoint) {
    return null
  }

  if (/^[A-Za-z0-9]$/.test(character)) {
    return character
  }

  return codePoint <= 0xffff
    ? `uni${formatUnicodeHex(codePoint)}`
    : `u${formatUnicodeHex(codePoint)}`
}

const parseGlyphAdditionInput = (input: string) => {
  const results: Array<{ id: string; name: string; unicode: string | null }> = []
  const seen = new Set<string>()
  const uniPattern = /uni([0-9a-fA-F]{4,6})/g
  const consumedRanges: Array<[number, number]> = []

  for (const match of input.matchAll(uniPattern)) {
    const hex = match[1]?.toUpperCase()
    const index = match.index ?? -1
    if (!hex || index < 0) {
      continue
    }
    const codePoint = Number.parseInt(hex, 16)
    if (!Number.isFinite(codePoint)) {
      continue
    }
    const id = `uni${hex}`
    const character = String.fromCodePoint(codePoint)
    if (!seen.has(id)) {
      results.push({ id, name: character, unicode: hex })
      seen.add(id)
    }
    consumedRanges.push([index, index + match[0].length])
  }

  const characters = Array.from(input)
  let cursor = 0
  for (const character of characters) {
    const start = cursor
    const end = cursor + character.length
    cursor = end
    const isConsumed = consumedRanges.some(([rangeStart, rangeEnd]) => start >= rangeStart && end <= rangeEnd)
    if (isConsumed || /\s/.test(character)) {
      continue
    }
    const id = buildGlyphIdFromChar(character)
    const codePoint = character.codePointAt(0)
    if (!id || !codePoint || seen.has(id)) {
      continue
    }
    results.push({
      id,
      name: character,
      unicode: formatUnicodeHex(codePoint),
    })
    seen.add(id)
  }

  return results
}

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
  const overviewGridState = useStore((state) => state.overviewGridState) as GridStateSnapshot | null
  const setOverviewGridState = useStore((state) => state.setOverviewGridState)
  const gridRef = useRef<VirtuosoGridHandle | null>(null)
  const restoreSnapshotRef = useRef<GridStateSnapshot | null>(overviewGridState)

  const overviewGlyphs = useMemo(
    () =>
      showOnlyEmptyGlyphs
        ? filteredGlyphList.filter(
            (glyph) => glyph.paths.length === 0 && glyph.componentRefs.length === 0
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
    if (selectedSectionId !== 'all' && !sections.some((section) => section.id === selectedSectionId)) {
      setOverviewSectionId('all')
    }
  }, [sections, selectedSectionId, setOverviewSectionId])

  useEffect(() => {
    restoreSnapshotRef.current = overviewGridState
  }, [overviewGridState])

  const selectedGlyph = overviewGlyphs.find((glyph) => glyph.id === selectedGlyphId) ?? null
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
    const missingCandidates = candidates.filter((candidate) => !existingGlyphIds.has(candidate.id))
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

            <Box>
              {!isAddingGlyphs ? (
                <Button
                  size="sm"
                  variant="outline"
                  width="full"
                  onClick={() => setIsAddingGlyphs(true)}
                >
                  ＋ 新增字符
                </Button>
              ) : (
                <Stack spacing={2}>
                  <Input
                    placeholder="輸入字符或 uni8655 uni8656"
                    value={glyphInputValue}
                    onChange={(event) => setGlyphInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddGlyphs()
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        setGlyphInputValue('')
                        setIsAddingGlyphs(false)
                      }
                    }}
                    bg="white"
                    borderColor="blackAlpha.200"
                    focusBorderColor="teal.400"
                  />
                  <HStack>
                    <Button size="sm" colorScheme="teal" flex={1} onClick={handleAddGlyphs}>
                      新增
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGlyphInputValue('')
                        setIsAddingGlyphs(false)
                      }}
                    >
                      取消
                    </Button>
                  </HStack>
                </Stack>
              )}
            </Box>

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
                目前共 {overviewGlyphs.length.toLocaleString()} 個字符
              </Text>
              <Tag size="sm" colorScheme="teal" variant="subtle">
                Overview
              </Tag>
            </HStack>

            <Checkbox
              isChecked={showOnlyEmptyGlyphs}
              onChange={(event) => setShowOnlyEmptyGlyphs(event.target.checked)}
              colorScheme="teal"
              size="sm"
            >
              只看空白待編輯字符
            </Checkbox>
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
                <Tag size="sm">{overviewGlyphs.length}</Tag>
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
