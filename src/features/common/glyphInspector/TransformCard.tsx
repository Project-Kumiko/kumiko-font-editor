import {
  Box,
  Button,
  Divider,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import type { GlyphData } from '../../../store'
import {
  buildAlignUpdates,
  buildFieldCommitUpdates,
  buildMirrorUpdates,
  formatTransformNumber,
  getSelectedNodes,
  getSelectionBounds,
  type AlignTarget,
  type NodePositionUpdate,
  type TransformField,
} from './transformGeometry'

interface TransformCardProps {
  glyph: GlyphData | null
  selectedNodeIds: string[]
  onMoveSelection: (updates: NodePositionUpdate[]) => void
}

export function TransformCard({
  glyph,
  selectedNodeIds,
  onMoveSelection,
}: TransformCardProps) {
  const selectedNodes = useMemo(
    () => getSelectedNodes(glyph?.paths ?? [], selectedNodeIds),
    [glyph?.paths, selectedNodeIds]
  )
  const bounds = useMemo(
    () => getSelectionBounds(selectedNodes),
    [selectedNodes]
  )
  const [focusedField, setFocusedField] = useState<TransformField | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const boundsValues = useMemo(
    () => ({
      x: formatTransformNumber(bounds?.xMin),
      y: formatTransformNumber(bounds?.yMin),
      width: formatTransformNumber(bounds?.width),
      height: formatTransformNumber(bounds?.height),
    }),
    [bounds]
  )

  const commitField = (field: TransformField, value: string) => {
    if (!bounds || selectedNodes.length === 0 || value.trim() === '') {
      return
    }

    const updates = buildFieldCommitUpdates(field, value, selectedNodes, bounds)
    if (updates.length > 0) {
      onMoveSelection(updates)
    }
  }

  const handleFieldChange = (field: TransformField, value: string) => {
    void field
    setDraftValue(value)
  }

  const handleFieldBlur = (field: TransformField) => {
    setFocusedField(null)
    commitField(field, draftValue)
    setDraftValue('')
  }

  const applyMirror = (axis: 'x' | 'y') => {
    if (!bounds || selectedNodes.length === 0) {
      return
    }

    onMoveSelection(buildMirrorUpdates(selectedNodes, bounds, axis))
  }

  const applyAlign = (target: AlignTarget) => {
    if (!bounds || selectedNodes.length === 0) {
      return
    }

    onMoveSelection(buildAlignUpdates(selectedNodes, bounds, target))
  }

  const isDisabled = selectedNodes.length === 0

  return (
    <Box p={4} bg="field.panel" borderRadius="sm">
      <HStack justify="space-between" align="start" mb={3}>
        <Box>
          <Heading size="sm" textTransform="uppercase" color="field.ink">
            Transform
          </Heading>
          <Text fontSize="xs" color="field.muted" fontFamily="mono">
            {selectedNodes.length > 0
              ? `${selectedNodes.length} nodes selected`
              : 'No editable selection'}
          </Text>
        </Box>
      </HStack>

      <Stack spacing={4}>
        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
          {(
            [
              ['x', 'X'],
              ['y', 'Y'],
              ['width', 'W'],
              ['height', 'H'],
            ] as const
          ).map(([field, label]) => (
            <GridItem key={field}>
              <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
                {label}
              </Text>
              <Input
                size="sm"
                type="number"
                value={
                  focusedField === field ? draftValue : boundsValues[field]
                }
                isDisabled={isDisabled}
                onFocus={() => {
                  setFocusedField(field)
                  setDraftValue(boundsValues[field])
                }}
                onChange={(event) =>
                  handleFieldChange(field, event.target.value)
                }
                onBlur={() => handleFieldBlur(field)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur()
                  }
                }}
              />
            </GridItem>
          ))}
        </Grid>

        <Divider borderColor="field.panelMuted" />

        <Stack spacing={2}>
          <Text fontSize="xs" color="field.muted" fontFamily="mono">
            Mirror
          </Text>
          <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={2}>
            <Tooltip label="Mirror horizontally">
              <Button
                size="sm"
                variant="outline"
                isDisabled={isDisabled}
                onClick={() => applyMirror('x')}
              >
                Flip X
              </Button>
            </Tooltip>
            <Tooltip label="Mirror vertically">
              <Button
                size="sm"
                variant="outline"
                isDisabled={isDisabled}
                onClick={() => applyMirror('y')}
              >
                Flip Y
              </Button>
            </Tooltip>
          </Grid>
        </Stack>

        <Stack spacing={2}>
          <Text fontSize="xs" color="field.muted" fontFamily="mono">
            Align
          </Text>
          <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={2}>
            {(
              [
                ['left', 'L', 'Align left'],
                ['centerX', 'C', 'Align horizontal center'],
                ['right', 'R', 'Align right'],
                ['top', 'T', 'Align top'],
                ['middleY', 'M', 'Align vertical middle'],
                ['bottom', 'B', 'Align bottom'],
              ] as const
            ).map(([target, label, tooltip]) => (
              <Tooltip key={target} label={tooltip}>
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={isDisabled}
                  onClick={() => applyAlign(target)}
                >
                  {label}
                </Button>
              </Tooltip>
            ))}
          </Grid>
        </Stack>
      </Stack>
    </Box>
  )
}
