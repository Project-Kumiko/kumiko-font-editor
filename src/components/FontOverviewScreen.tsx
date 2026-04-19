import { useEffect, useMemo, useState } from 'react'
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
  SimpleGrid,
  Stack,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useStore, type GlyphData } from '../store'
import {
  getGlyphBlockLabel,
  getGlyphDisplayCharacter,
  getGlyphOverviewSections,
  getGlyphOverviewStats,
  getGlyphScriptLabel,
  type OverviewGroupBy,
} from '../lib/glyphOverview'
import { RightPanel } from './RightPanel'

function GlyphCard({
  glyph,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  glyph: GlyphData
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
}) {
  const displayCharacter = getGlyphDisplayCharacter(glyph)
  const stats = getGlyphOverviewStats(glyph)

  return (
    <Box
      p={3}
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
      <Stack spacing={3}>
        <Flex
          align="center"
          justify="center"
          h="92px"
          borderRadius="lg"
          bg="linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)"
          border="1px solid"
          borderColor="blackAlpha.100"
        >
          <Text
            fontSize={displayCharacter ? '4xl' : 'xl'}
            fontWeight="medium"
            color="gray.800"
            lineHeight={1}
            userSelect="none"
          >
            {displayCharacter ?? glyph.name}
          </Text>
        </Flex>

        <Box minW={0}>
          <Text fontSize="sm" fontWeight="bold" color="gray.800" noOfLines={1}>
            {glyph.name}
          </Text>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {glyph.id}
          </Text>
        </Box>

        <HStack spacing={2} flexWrap="wrap">
          <Tag size="sm" colorScheme="blue" variant="subtle">
            {glyph.metrics.width}
          </Tag>
          <Tag size="sm" colorScheme="gray" variant="subtle">
            {stats.contourCount} contours
          </Tag>
          {stats.componentCount > 0 && (
            <Tag size="sm" colorScheme="purple" variant="subtle">
              {stats.componentCount} comps
            </Tag>
          )}
        </HStack>
      </Stack>
    </Box>
  )
}

export function FontOverviewScreen() {
  const currentSearchQuery = useStore((state) => state.currentSearchQuery)
  const setSearchQuery = useStore((state) => state.setSearchQuery)
  const filteredGlyphList = useStore((state) => state.filteredGlyphList)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const setSelectedGlyphId = useStore((state) => state.setSelectedGlyphId)
  const setWorkspaceView = useStore((state) => state.setWorkspaceView)
  const closeProjectState = useStore((state) => state.closeProjectState)
  const projectTitle = useStore((state) => state.projectTitle)

  const [groupBy, setGroupBy] = useState<OverviewGroupBy>('script')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all')

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

  useEffect(() => {
    if (selectedSectionId !== 'all' && !sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId('all')
    }
  }, [sections, selectedSectionId])

  const selectedGlyph = filteredGlyphList.find((glyph) => glyph.id === selectedGlyphId) ?? null

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
                  setGroupBy(event.target.value as OverviewGroupBy)
                  setSelectedSectionId('all')
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
                onClick={() => setSelectedSectionId('all')}
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
                    setSelectedSectionId(section.id)
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
              visibleSections.map((section) => (
                <Box
                  key={section.id}
                  p={4}
                  bg="white"
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="blackAlpha.100"
                  boxShadow="sm"
                >
                  <HStack justify="space-between" mb={4}>
                    <Heading size="sm" color="gray.800">
                      {section.label}
                    </Heading>
                    <Tag size="sm" colorScheme="gray" variant="subtle">
                      {section.glyphs.length}
                    </Tag>
                  </HStack>

                  <SimpleGrid minChildWidth="140px" spacing={3}>
                    {section.glyphs.map((glyph) => (
                      <GlyphCard
                        key={glyph.id}
                        glyph={glyph}
                        isSelected={glyph.id === selectedGlyphId}
                        onClick={() => setSelectedGlyphId(glyph.id)}
                        onDoubleClick={() => {
                          setSelectedGlyphId(glyph.id)
                          setWorkspaceView('editor')
                        }}
                      />
                    ))}
                  </SimpleGrid>
                </Box>
              ))
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
