import {
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  Input,
  Stack,
  Tag,
  Text,
} from '@chakra-ui/react'
import { CornerNodeIcon, SmoothNodeIcon } from '../../icons'
import type { NodeType, SelectedSegmentState } from '../../store'

interface NodeInspectorCardProps {
  effectiveNodeType: NodeType | undefined
  isEndpointNode: boolean
  isOnCurveNode: boolean
  nodeRef: { pathId: string; nodeId: string } | null
  selectedNode: { x: number; y: number } | null
  selectedSegment: SelectedSegmentState | null
  onCoordinateChange: (axis: 'x' | 'y', value: string) => void
  onConvertSelectedSegment: () => void
  onNodeTypeChange: (type: NodeType) => void
}

export function NodeInspectorCard({
  effectiveNodeType,
  isEndpointNode,
  isOnCurveNode,
  nodeRef,
  selectedNode,
  selectedSegment,
  onCoordinateChange,
  onConvertSelectedSegment,
  onNodeTypeChange,
}: NodeInspectorCardProps) {
  return (
    <Box
      p={4}
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="blackAlpha.100"
    >
      <Heading size="sm" mb={3}>
        節點檢視
      </Heading>
      {!selectedNode || !nodeRef ? (
        selectedSegment ? (
          <Stack spacing={3}>
            <Text fontSize="sm" color="gray.600">
              Segment{' '}
              <Tag size="sm" ml={2}>
                {selectedSegment.pathId}
              </Tag>
            </Text>
            <Text fontSize="sm" color="gray.500">
              目前高亮的是一段
              {selectedSegment.type === 'line' ? '直線' : '曲線'}。
            </Text>
            {selectedSegment.type === 'line' ? (
              <Button
                size="sm"
                colorScheme="blue"
                onClick={onConvertSelectedSegment}
              >
                轉成曲線
              </Button>
            ) : (
              <Text fontSize="sm" color="gray.500">
                這段已經是曲線，不需要再轉換。
              </Text>
            )}
          </Stack>
        ) : (
          <Text fontSize="sm" color="gray.500">
            目前沒有選取節點。點擊畫布上的節點即可在這裡微調座標與節點類型。
          </Text>
        )
      ) : (
        <Stack spacing={3}>
          <Text fontSize="sm" color="gray.600">
            Path{' '}
            <Tag size="sm" ml={2}>
              {nodeRef.pathId}
            </Tag>
          </Text>

          <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
            <GridItem>
              <Text fontSize="xs" color="gray.500" mb={1}>
                X
              </Text>
              <Input
                size="sm"
                type="number"
                value={selectedNode.x}
                onChange={(event) =>
                  onCoordinateChange('x', event.target.value)
                }
              />
            </GridItem>
            <GridItem>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Y
              </Text>
              <Input
                size="sm"
                type="number"
                value={selectedNode.y}
                onChange={(event) =>
                  onCoordinateChange('y', event.target.value)
                }
              />
            </GridItem>
          </Grid>

          {!isOnCurveNode ? (
            <Text fontSize="sm" color="gray.500">
              目前選到的是控制把手。把手本身沒有方形／圓形節點類型。
            </Text>
          ) : (
            <Stack spacing={2}>
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={2}>
                <Button
                  size="sm"
                  variant={effectiveNodeType === 'corner' ? 'solid' : 'outline'}
                  colorScheme="orange"
                  onClick={() => onNodeTypeChange('corner')}
                  leftIcon={<CornerNodeIcon />}
                >
                  折線
                </Button>
                <Button
                  size="sm"
                  variant={effectiveNodeType === 'smooth' ? 'solid' : 'outline'}
                  colorScheme="blue"
                  onClick={() => onNodeTypeChange('smooth')}
                  isDisabled={isEndpointNode}
                  leftIcon={<SmoothNodeIcon />}
                >
                  平滑
                </Button>
              </Grid>
              <Text fontSize="xs" color="gray.500">
                {isEndpointNode
                  ? '開放路徑的起點與終點只有一根手把，所以固定為折線。'
                  : effectiveNodeType === 'smooth'
                    ? '平滑節點的兩根手把會連動，維持曲線方向。'
                    : '折線節點的兩根手把可分開移動，會視為折線轉折。'}
              </Text>
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  )
}
