import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Spinner,
  Stack,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { GlyphReadonlyReference } from './GlyphReadonlyReference'
import { searchProjectGlyphsByComponent } from '../lib/componentSearchWorkerClient'
import {
  getGlyphCharacter,
  getRelatedGlyphs,
  isCjkCharacter,
} from '../lib/glyphRelations'
import { buildGlyphPreviewData } from '../lib/glyphOverview'
import type { GlyphData } from '../store'
import { useStore } from '../store'

interface SearchState {
  loading: boolean
  components: string[]
  activeComponent: string | null
  resultGlyphIds: string[]
  error: string | null
}

const READONLY_FLIP_OFFSET = 680

function InlineGlyphPreview({
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

  return (
    <Box
      as="svg"
      viewBox={preview.viewBox}
      width="1.4em"
      height="1.4em"
      display="inline-block"
      verticalAlign="middle"
      overflow="visible"
      fill="currentColor"
      flexShrink={0}
    >
      <g transform={`translate(0 ${READONLY_FLIP_OFFSET}) scale(1 -1)`}>
        {preview.shapes.map((shape, index) => (
          <path
            key={`${glyph.id}-inline-${index}`}
            d={shape.d}
            transform={shape.transform}
            fill="currentColor"
          />
        ))}
      </g>
    </Box>
  )
}

export function LeftPanel() {
  const fontData = useStore((state) => state.fontData)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const addGlyphToEditor = useStore((state) => state.addGlyphToEditor)
  const setWorkspaceView = useStore((state) => state.setWorkspaceView)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null
  )
  const [previewGlyphId, setPreviewGlyphId] = useState<string | null>(null)
  const [searchState, setSearchState] = useState<SearchState>({
    loading: false,
    components: [],
    activeComponent: null,
    resultGlyphIds: [],
    error: null,
  })

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
  const selectedCharacter = getGlyphCharacter(selectedGlyph)
  const isCjkGlyph = isCjkCharacter(selectedCharacter)
  const relatedGlyphs = useMemo(
    () => (isCjkGlyph ? [] : getRelatedGlyphs(selectedGlyph, glyphs)),
    [glyphs, isCjkGlyph, selectedGlyph]
  )
  const projectGlyphSummaries = useMemo(
    () =>
      glyphs.map((glyph) => ({
        id: glyph.id,
        name: glyph.name,
        unicode: glyph.unicode ?? null,
      })),
    [glyphs]
  )
  const resultGlyphs = useMemo(
    () =>
      (isCjkGlyph
        ? searchState.resultGlyphIds
        : relatedGlyphs.map((glyph) => glyph.id)
      )
        .map((glyphId) => glyphMap[glyphId])
        .filter((glyph): glyph is GlyphData => Boolean(glyph)),
    [glyphMap, isCjkGlyph, relatedGlyphs, searchState.resultGlyphIds]
  )
  const previewGlyph =
    (previewGlyphId ? glyphMap[previewGlyphId] : null) ??
    resultGlyphs[0] ??
    null

  useEffect(() => {
    setSelectedComponent(null)
    setPreviewGlyphId(null)
    setSearchState({
      loading: false,
      components: [],
      activeComponent: null,
      resultGlyphIds: [],
      error: null,
    })
  }, [selectedGlyphId])

  useEffect(() => {
    if (!resultGlyphs.some((glyph) => glyph.id === previewGlyphId)) {
      setPreviewGlyphId(resultGlyphs[0]?.id ?? null)
    }
  }, [previewGlyphId, resultGlyphs])

  useEffect(() => {
    if (!selectedGlyph || !selectedCharacter || !isCjkGlyph) {
      return
    }

    const controller = new AbortController()
    setSearchState((current) => ({
      ...current,
      loading: true,
      error: null,
    }))

    void searchProjectGlyphsByComponent({
      character: selectedCharacter,
      selectedComponent,
      currentGlyphId: selectedGlyph.id,
      projectGlyphs: projectGlyphSummaries,
      signal: controller.signal,
    })
      .then((result) => {
        setSearchState({
          loading: false,
          components: result.components,
          activeComponent: result.activeComponent,
          resultGlyphIds: result.glyphIds,
          error: null,
        })

        if (
          result.activeComponent &&
          result.activeComponent !== selectedComponent
        ) {
          setSelectedComponent(result.activeComponent)
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setSearchState({
          loading: false,
          components: [],
          activeComponent: null,
          resultGlyphIds: [],
          error: error instanceof Error ? error.message : '部件搜尋失敗',
        })
      })

    return () => controller.abort()
  }, [
    isCjkGlyph,
    projectGlyphSummaries,
    selectedCharacter,
    selectedComponent,
    selectedGlyph,
  ])

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
              {isCjkGlyph ? '部件檢索' : '相關字形'}
            </Heading>
          </Box>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setWorkspaceView('overview')}
          >
            ⬅︎ 所有字符
          </Button>
        </HStack>

        {!selectedGlyph ? (
          <Text fontSize="sm" color="gray.500">
            先選擇一個字符。
          </Text>
        ) : null}

        {isCjkGlyph && selectedGlyph ? (
          <VStack align="stretch" spacing={2}>
            <Text fontSize="sm" color="gray.600">
              拆字部件
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              {searchState.loading && searchState.components.length === 0 ? (
                <HStack spacing={2}>
                  <Spinner size="sm" color="teal.500" />
                  <Text fontSize="sm" color="gray.500">
                    分析中
                  </Text>
                </HStack>
              ) : searchState.components.length > 0 ? (
                searchState.components.map((component) => (
                  <Button
                    key={component}
                    size="sm"
                    variant={
                      component ===
                      (selectedComponent ?? searchState.activeComponent)
                        ? 'solid'
                        : 'outline'
                    }
                    colorScheme="teal"
                    onClick={() => setSelectedComponent(component)}
                  >
                    {component}
                  </Button>
                ))
              ) : (
                <Text fontSize="sm" color="gray.500">
                  找不到可用的拆字部件。
                </Text>
              )}
            </HStack>
          </VStack>
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
                const isActive = glyph.id === previewGlyph?.id
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
                    onClick={() => setPreviewGlyphId(glyph.id)}
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

        <Box flexShrink={0} minH={0}>
          {previewGlyph ? (
            <VStack align="stretch" spacing={2} h="100%">
              <HStack justify="space-between" align="center">
                <Box minW={0}>
                  <Text fontSize="sm" color="gray.600">
                    部件預覽
                  </Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>
                    {previewGlyph.id}
                  </Text>
                </Box>
                <Button
                  size="xs"
                  colorScheme="teal"
                  variant="outline"
                  onClick={() => addGlyphToEditor(previewGlyph.id)}
                >
                  加入編輯器
                </Button>
              </HStack>
              <GlyphReadonlyReference
                glyph={previewGlyph}
                glyphMap={glyphMap}
              />
            </VStack>
          ) : null}
        </Box>
      </Stack>

      {searchState.error ? (
        <Text mt={3} fontSize="sm" color="red.500">
          {searchState.error}
        </Text>
      ) : null}
    </Box>
  )
}
