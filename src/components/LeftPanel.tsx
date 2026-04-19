import { Box, Divider, Heading, HStack, Input, Tag, Text, VStack, Button } from '@chakra-ui/react';
import { Virtuoso } from 'react-virtuoso';
import { useStore } from '../store';

export function LeftPanel() {
  const currentSearchQuery = useStore((state) => state.currentSearchQuery);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const filteredGlyphList = useStore((state) => state.filteredGlyphList);
  const selectedGlyphId = useStore((state) => state.selectedGlyphId);
  const setSelectedGlyphId = useStore((state) => state.setSelectedGlyphId);
  const setWorkspaceView = useStore((state) => state.setWorkspaceView);
  const closeProjectState = useStore((state) => state.closeProjectState);

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
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color="gray.500" mb={1}>
              Kumiko Font Editor
            </Text>
            <Heading size="md" color="gray.800">
              部件檢索
            </Heading>
          </Box>
          <VStack spacing={1} align="stretch">
            <Button size="sm" variant="ghost" onClick={() => setWorkspaceView('overview')}>
              ⬅︎ 所有字符
            </Button>
            <Button size="sm" variant="ghost" onClick={closeProjectState}>
              ⌂ 首頁
            </Button>
          </VStack>
        </HStack>

        <Input
          placeholder="搜尋部件、字形或 IDS (例如 木 / 林 / uni6728)"
          value={currentSearchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          bg="white"
          borderColor="blackAlpha.200"
          focusBorderColor="teal.400"
        />

        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="gray.600">
            過濾結果 {filteredGlyphList.length.toLocaleString()}
          </Text>
          <Tag size="sm" colorScheme="teal" variant="subtle">
            Virtuoso
          </Tag>
        </HStack>
      </VStack>

      <Divider mb={4} />

      <Box flex={1} minH={0} bg="white" borderRadius="xl" border="1px solid" borderColor="blackAlpha.100" overflow="hidden">
        <Virtuoso
          style={{ height: '100%', width: '100%' }}
          data={filteredGlyphList}
          itemContent={(_, glyph) => {
            const isSelected = glyph.id === selectedGlyphId;

            return (
              <Box
                px={4}
                py={3}
                borderBottom="1px solid"
                borderColor="blackAlpha.50"
                bg={isSelected ? 'teal.50' : 'white'}
                cursor="pointer"
                transition="background-color 120ms ease"
                _hover={{ bg: isSelected ? 'teal.50' : 'gray.50' }}
                onClick={() => setSelectedGlyphId(glyph.id)}
              >
                <HStack justify="space-between" align="start" spacing={3}>
                  <Box minW={0}>
                    <Text fontWeight={isSelected ? 'bold' : 'semibold'} color="gray.800" noOfLines={1}>
                      {glyph.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {glyph.id}
                    </Text>
                  </Box>
                  {glyph.components.length > 0 && (
                    <Tag size="sm" colorScheme={isSelected ? 'teal' : 'gray'} variant={isSelected ? 'solid' : 'subtle'}>
                      {glyph.components.join('')}
                    </Tag>
                  )}
                </HStack>
              </Box>
            );
          }}
        />
      </Box>
    </Box>
  );
}
