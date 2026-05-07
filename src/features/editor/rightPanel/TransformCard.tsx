import {
  Box,
  Button,
  Divider,
  Grid,
  GridItem,
  Heading,
  IconButton,
  HStack,
  Input,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import {
  AlignBottomBox,
  AlignHorizontalCenters,
  AlignLeftBox,
  AlignRightBox,
  AlignTopBox,
  AlignVerticalCenters,
  ArrowUnion,
  Divide,
  Flip,
  Intersect,
  Mirror,
  RotateCameraRight,
  Substract,
} from 'iconoir-react'
import { useMemo, useState, type MouseEvent } from 'react'
import type { GlyphData } from '../../../store'
import {
  buildAlignUpdates,
  buildFieldCommitUpdates,
  buildMirrorUpdates,
  buildRotatedUpdates,
  buildScaledUpdates,
  buildSkewedUpdates,
  formatTransformNumber,
  getSelectedNodes,
  getSelectionBounds,
  parseTransformNumber,
  type AlignTarget,
  type NodePositionUpdate,
  type TransformField,
  type TransformOrigin,
} from './transformGeometry'

interface TransformCardProps {
  glyph: GlyphData | null
  selectedNodeIds: string[]
  onMoveSelection: (updates: NodePositionUpdate[]) => void
}

type TransformActionField = 'rotate' | 'scaleX' | 'scaleY' | 'skewX' | 'skewY'

interface SteppedNumberInputProps {
  value: string
  placeholder?: string
  isDisabled?: boolean
  step?: number
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onStep: (delta: number) => void
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
  const [origin, setOrigin] = useState<TransformOrigin>({
    x: 'center',
    y: 'middle',
  })
  const [actionDrafts, setActionDrafts] = useState<
    Record<TransformActionField, string>
  >({
    rotate: '',
    scaleX: '100',
    scaleY: '100',
    skewX: '',
    skewY: '',
  })
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

    const updates = buildFieldCommitUpdates(
      field,
      value,
      selectedNodes,
      bounds,
      origin
    )
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

  const stepField = (field: TransformField, delta: number) => {
    const currentValue =
      focusedField === field ? draftValue : boundsValues[field]
    const nextValue = String(parseTransformNumber(currentValue) + delta)
    if (focusedField === field) {
      setDraftValue(nextValue)
    }
    commitField(field, nextValue)
  }

  const applyMirror = (axis: 'x' | 'y') => {
    if (!bounds || selectedNodes.length === 0) {
      return
    }

    onMoveSelection(buildMirrorUpdates(selectedNodes, bounds, axis, origin))
  }

  const applyAlign = (target: AlignTarget) => {
    if (!bounds || selectedNodes.length === 0) {
      return
    }

    onMoveSelection(buildAlignUpdates(selectedNodes, bounds, target))
  }

  const resetActionDraft = (field: TransformActionField) => {
    setActionDrafts((current) => ({
      ...current,
      [field]: field === 'scaleX' || field === 'scaleY' ? '100' : '',
    }))
  }

  const applyAction = (field: TransformActionField, value: string) => {
    if (!bounds || selectedNodes.length === 0 || value.trim() === '') {
      return
    }

    const amount = Number.parseFloat(value)
    if (!Number.isFinite(amount)) {
      return
    }

    let updates: NodePositionUpdate[] = []
    if (field === 'rotate' && amount !== 0) {
      updates = buildRotatedUpdates(selectedNodes, bounds, amount, origin)
    } else if (field === 'scaleX' && amount > 0 && amount !== 100) {
      updates = buildScaledUpdates(
        selectedNodes,
        bounds,
        amount / 100,
        1,
        origin
      )
    } else if (field === 'scaleY' && amount > 0 && amount !== 100) {
      updates = buildScaledUpdates(
        selectedNodes,
        bounds,
        1,
        amount / 100,
        origin
      )
    } else if (field === 'skewX' && amount !== 0) {
      updates = buildSkewedUpdates(selectedNodes, bounds, amount, 0, origin)
    } else if (field === 'skewY' && amount !== 0) {
      updates = buildSkewedUpdates(selectedNodes, bounds, 0, amount, origin)
    }

    if (updates.length > 0) {
      onMoveSelection(updates)
    }
    resetActionDraft(field)
  }

  const setActionDraft = (field: TransformActionField, value: string) => {
    setActionDrafts((current) => ({ ...current, [field]: value }))
  }

  const stepAction = (field: TransformActionField, delta: number) => {
    const fallbackValue = field === 'scaleX' || field === 'scaleY' ? '100' : '0'
    const currentValue = actionDrafts[field] || fallbackValue
    const nextValue = String(parseTransformNumber(currentValue) + delta)
    setActionDraft(field, nextValue)
    applyAction(field, nextValue)
  }

  const isDisabled = selectedNodes.length === 0
  const alignButtons: Array<{
    icon: typeof AlignLeftBox
    label: string
    target: AlignTarget
  }> = [
    { icon: AlignLeftBox, label: 'Align left', target: 'left' },
    {
      icon: AlignHorizontalCenters,
      label: 'Align horizontal center',
      target: 'centerX',
    },
    { icon: AlignRightBox, label: 'Align right', target: 'right' },
    { icon: AlignTopBox, label: 'Align top', target: 'top' },
    {
      icon: AlignVerticalCenters,
      label: 'Align vertical middle',
      target: 'middleY',
    },
    { icon: AlignBottomBox, label: 'Align bottom', target: 'bottom' },
  ]
  const pathActions = [
    { icon: ArrowUnion, label: 'Union' },
    { icon: Substract, label: 'Subtract' },
    { icon: Intersect, label: 'Intersect' },
    { icon: Divide, label: 'Divide' },
  ]

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
        <HStack align="start" spacing={4}>
          <Box minW="72px">
            <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
              Origin
            </Text>
            <Grid templateColumns="repeat(3, 18px)" gap="3px">
              {(
                [
                  ['left', 'top'],
                  ['center', 'top'],
                  ['right', 'top'],
                  ['left', 'middle'],
                  ['center', 'middle'],
                  ['right', 'middle'],
                  ['left', 'bottom'],
                  ['center', 'bottom'],
                  ['right', 'bottom'],
                ] as const
              ).map(([x, y]) => {
                const isActive = origin.x === x && origin.y === y
                return (
                  <Tooltip key={`${x}-${y}`} label={`${x} ${y}`}>
                    <Button
                      aria-label={`${x} ${y} origin`}
                      size="xs"
                      minW="18px"
                      h="18px"
                      p={0}
                      borderRadius="1px"
                      variant={isActive ? 'solid' : 'outline'}
                      isDisabled={isDisabled}
                      onClick={() => setOrigin({ x, y })}
                    >
                      <Box
                        w="5px"
                        h="5px"
                        bg={isActive ? 'field.ink' : 'field.muted'}
                      />
                    </Button>
                  </Tooltip>
                )
              })}
            </Grid>
          </Box>

          <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3} flex="1">
            {(
              [
                ['x', 'X'],
                ['y', 'Y'],
                ['width', 'W'],
                ['height', 'H'],
              ] as const
            ).map(([field, label]) => (
              <GridItem key={field}>
                <Text
                  fontSize="xs"
                  color="field.muted"
                  mb={1}
                  fontFamily="mono"
                >
                  {label}
                </Text>
                <SteppedNumberInput
                  value={
                    focusedField === field ? draftValue : boundsValues[field]
                  }
                  isDisabled={isDisabled}
                  onFocus={() => {
                    setFocusedField(field)
                    setDraftValue(boundsValues[field])
                  }}
                  onChange={(event) => handleFieldChange(field, event)}
                  onBlur={() => handleFieldBlur(field)}
                  onStep={(delta) => stepField(field, delta)}
                />
              </GridItem>
            ))}
          </Grid>
        </HStack>

        <Divider borderColor="field.panelMuted" />

        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
          {(
            [
              ['rotate', 'Rotate', 'deg', 1],
              ['scaleX', 'Scale X', '%', 1],
              ['scaleY', 'Scale Y', '%', 1],
              ['skewX', 'Skew X', 'deg', 1],
              ['skewY', 'Skew Y', 'deg', 1],
            ] as const
          ).map(([field, label, placeholder, step]) => (
            <GridItem key={field}>
              <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
                {label}
              </Text>
              <SteppedNumberInput
                value={actionDrafts[field]}
                placeholder={placeholder}
                step={step}
                isDisabled={isDisabled}
                onChange={(value) => setActionDraft(field, value)}
                onBlur={() => applyAction(field, actionDrafts[field])}
                onStep={(delta) => stepAction(field, delta)}
              />
            </GridItem>
          ))}
          <GridItem>
            <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
              Quick
            </Text>
            <Tooltip label="Rotate 90 degrees">
              <IconButton
                aria-label="Rotate 90 degrees"
                icon={<RotateCameraRight width={16} height={16} />}
                size="sm"
                w="100%"
                isDisabled={isDisabled}
                onClick={() => applyAction('rotate', '90')}
              />
            </Tooltip>
          </GridItem>
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
                leftIcon={<Mirror width={16} height={16} />}
                isDisabled={isDisabled}
                onClick={() => applyMirror('x')}
              >
                X
              </Button>
            </Tooltip>
            <Tooltip label="Mirror vertically">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Flip width={16} height={16} />}
                isDisabled={isDisabled}
                onClick={() => applyMirror('y')}
              >
                Y
              </Button>
            </Tooltip>
          </Grid>
        </Stack>

        <Stack spacing={2}>
          <Text fontSize="xs" color="field.muted" fontFamily="mono">
            Align
          </Text>
          <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={2}>
            {alignButtons.map(({ icon: Icon, label, target }) => (
              <Tooltip key={target} label={label}>
                <IconButton
                  aria-label={label}
                  size="sm"
                  variant="outline"
                  isDisabled={isDisabled}
                  icon={<Icon width={16} height={16} />}
                  onClick={() => applyAlign(target)}
                />
              </Tooltip>
            ))}
          </Grid>
        </Stack>

        <Divider borderColor="field.panelMuted" />

        <Stack spacing={2}>
          <HStack justify="space-between">
            <Text fontSize="xs" color="field.muted" fontFamily="mono">
              Path ops
            </Text>
            <Text fontSize="10px" color="field.muted" fontFamily="mono">
              contour tools next
            </Text>
          </HStack>
          <Grid templateColumns="repeat(4, minmax(0, 1fr))" gap={2}>
            {pathActions.map(({ icon: Icon, label }) => (
              <Tooltip key={label} label={label}>
                <IconButton
                  aria-label={label}
                  icon={<Icon width={16} height={16} />}
                  size="sm"
                  variant="outline"
                  isDisabled
                />
              </Tooltip>
            ))}
          </Grid>
        </Stack>
      </Stack>
    </Box>
  )
}

function SteppedNumberInput({
  value,
  placeholder,
  isDisabled,
  step = 1,
  onChange,
  onFocus,
  onBlur,
  onStep,
}: SteppedNumberInputProps) {
  const handleStep = (direction: 1 | -1) => {
    onStep(step * direction)
  }

  return (
    <Box position="relative">
      <Input
        size="sm"
        type="number"
        pr="24px"
        step={step}
        value={value}
        placeholder={placeholder}
        isDisabled={isDisabled}
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      <Box
        position="absolute"
        top="1px"
        right="1px"
        bottom="1px"
        w="20px"
        display="grid"
        gridTemplateRows="1fr 1fr"
        borderLeft="1px solid"
        borderColor="field.panelMuted"
        pointerEvents={isDisabled ? 'none' : 'auto'}
        opacity={isDisabled ? 0.35 : 1}
      >
        <Box
          as="button"
          type="button"
          aria-label="Increment value"
          fontSize="8px"
          lineHeight="1"
          color="field.muted"
          borderTopRightRadius="3px"
          _hover={{ bg: 'field.panelMuted', color: 'field.ink' }}
          onMouseDown={(event: MouseEvent<HTMLButtonElement>) =>
            event.preventDefault()
          }
          onClick={() => handleStep(1)}
        >
          ▲
        </Box>
        <Box
          as="button"
          type="button"
          aria-label="Decrement value"
          fontSize="8px"
          lineHeight="1"
          color="field.muted"
          borderBottomRightRadius="3px"
          _hover={{ bg: 'field.panelMuted', color: 'field.ink' }}
          onMouseDown={(event: MouseEvent<HTMLButtonElement>) =>
            event.preventDefault()
          }
          onClick={() => handleStep(-1)}
        >
          ▼
        </Box>
      </Box>
    </Box>
  )
}
