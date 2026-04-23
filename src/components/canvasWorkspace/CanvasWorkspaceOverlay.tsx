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
        borderRadius="sm"
        bg="rgba(8, 11, 13, 0.86)"
        border="1px solid"
        borderColor="rgba(247, 235, 64, 0.78)"
        backdropFilter="blur(10px)"
        boxShadow="none"
      >
        <Text
          fontSize="10px"
          color="field.yellow.300"
          fontFamily="mono"
          fontWeight="900"
          letterSpacing="0.12em"
        >
          Canvas Workspace
        </Text>
        <Text fontSize="xs" color="whiteAlpha.800">
          滾輪縮放，拖曳空白區平移視角
        </Text>
        <Text fontSize="xs" color="whiteAlpha.700" fontFamily="mono">
          `V` 游標，`P` 鋼筆，`B` 筆刷，`T` 文字，`H` 移動畫布
        </Text>

        <HStack mt={2}>
          <Button
            size="xs"
            variant="solid"
            onClick={onUndo}
            isDisabled={!canUndo}
          >
            ↩ Undo (⌘Z)
          </Button>
          <Button
            size="xs"
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
              borderRadius="sm"
              variant={activeToolId === tool.id ? 'solid' : 'ghost'}
              bg={
                activeToolId === tool.id
                  ? undefined
                  : tool.status === 'ready'
                    ? 'whiteAlpha.100'
                    : 'field.red.400'
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
        borderRadius="sm"
        bg="rgba(8, 11, 13, 0.76)"
        border="1px solid rgba(247, 235, 64, 0.32)"
        color="whiteAlpha.800"
        fontSize="xs"
        fontFamily="mono"
      >
        <Box as="span" bg="field.yellow.400" color="field.ink" px={1}>
          Wheel
        </Box>
        <Text>Zoom</Text>
        <Box as="span" bg="field.yellow.400" color="field.ink" px={1}>
          Drag
        </Box>
        <Text>Pan / Move Node</Text>
        <Box as="span" bg="field.yellow.400" color="field.ink" px={1}>
          Space
        </Box>
        <Text>Hold Hand Tool</Text>
      </Flex>
    </>
  )
}
