import { Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import type { ToolId } from './types'
import { AVAILABLE_TOOLS } from './types'

interface CanvasWorkspaceOverlayProps {
  activeToolId: ToolId
  canRedo: boolean
  canUndo: boolean
  onRedo: () => void
  onSelectTool: (toolId: ToolId) => void
  onUndo: () => void
}

export function CanvasWorkspaceOverlay({
  activeToolId,
  canRedo,
  canUndo,
  onRedo,
  onSelectTool,
  onUndo,
}: CanvasWorkspaceOverlayProps) {
  return (
    <>
      <Flex
        position="absolute"
        top={4}
        left={4}
        direction="column"
        gap={1}
        px={3}
        py={2}
        borderRadius="lg"
        bg="rgba(15, 23, 42, 0.78)"
        border="1px solid rgba(148, 163, 184, 0.22)"
        backdropFilter="blur(10px)"
      >
        <Text fontSize="xs" color="whiteAlpha.800">
          Canvas Workspace
        </Text>
        <Text fontSize="xs" color="whiteAlpha.700">
          滾輪縮放，拖曳空白區平移視角
        </Text>
        <Text fontSize="xs" color="whiteAlpha.700">
          `V` 游標，`P` 鋼筆，`B` 筆刷，`T` 文字，`H` 移動畫布
        </Text>

        <HStack mt={2}>
          <Button
            size="xs"
            colorScheme="teal"
            variant="solid"
            onClick={onUndo}
            isDisabled={!canUndo}
          >
            ↩ Undo (⌘Z)
          </Button>
          <Button
            size="xs"
            colorScheme="teal"
            variant="solid"
            onClick={onRedo}
            isDisabled={!canRedo}
          >
            ↪ Redo (⇧⌘Z)
          </Button>
        </HStack>

        <HStack mt={2} spacing={2} align="center">
          {AVAILABLE_TOOLS.map((tool) => (
            <Button
              key={tool.id}
              size="xs"
              px={2}
              py={1}
              borderRadius="md"
              variant={activeToolId === tool.id ? 'solid' : 'ghost'}
              colorScheme={activeToolId === tool.id ? 'teal' : undefined}
              bg={
                activeToolId === tool.id
                  ? undefined
                  : tool.status === 'ready'
                    ? 'whiteAlpha.200'
                    : 'orange.300'
              }
              color={
                activeToolId === tool.id
                  ? undefined
                  : tool.status === 'ready'
                    ? 'whiteAlpha.900'
                    : 'black'
              }
              fontSize="xs"
              onClick={() => onSelectTool(tool.id)}
            >
              {tool.label}
            </Button>
          ))}
        </HStack>
      </Flex>

      <Flex
        position="absolute"
        right={4}
        bottom={4}
        align="center"
        gap={2}
        px={3}
        py={2}
        borderRadius="lg"
        bg="rgba(15, 23, 42, 0.72)"
        color="whiteAlpha.800"
        fontSize="xs"
      >
        <Box as="span" bg="whiteAlpha.200" px={1} borderRadius="sm">
          Wheel
        </Box>
        <Text>Zoom</Text>
        <Box as="span" bg="whiteAlpha.200" px={1} borderRadius="sm">
          Drag
        </Box>
        <Text>Pan / Move Node</Text>
        <Box as="span" bg="whiteAlpha.200" px={1} borderRadius="sm">
          Space
        </Box>
        <Text>Hold Hand Tool</Text>
      </Flex>
    </>
  )
}
