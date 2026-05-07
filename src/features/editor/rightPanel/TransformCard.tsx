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
  Flip,
  Intersect,
  Cut,
  Lock,
  Refresh,
  ScaleFrameEnlarge,
  ScaleFrameReduce,
  Substract,
  Union,
} from 'iconoir-react'
import { useMemo, useState, type MouseEvent, type ReactElement } from 'react'
import type { GlyphData } from '../../../store'
import type { PathBooleanOperation } from '../../../lib/pathBooleanOperations'
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
  onPathOperation: (operation: PathBooleanOperation, pathIds: string[]) => void
}

type TransformActionField = 'rotate' | 'scaleX' | 'scaleY' | 'skewX' | 'skewY'
type ScaleAxis = 'x' | 'y'
type SkewAxis = 'x' | 'y'

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

interface ActionRowProps {
  label: string
  value: string
  unit: string
  isDisabled: boolean
  leftLabel: string
  rightLabel: string
  leftIcon: ReactElement
  rightIcon: ReactElement
  onChange: (value: string) => void
  onStep: (delta: number) => void
  onLeft: () => void
  onRight: () => void
}

interface ScaleActionGroupProps {
  scaleX: string
  scaleY: string
  isDisabled: boolean
  isScaleLocked: boolean
  onScaleXChange: (value: string) => void
  onScaleYChange: (value: string) => void
  onScaleXStep: (delta: number) => void
  onScaleYStep: (delta: number) => void
  onScaleXDown: () => void
  onScaleXUp: () => void
  onScaleYDown: () => void
  onScaleYUp: () => void
  onToggleLock: () => void
}

interface ScaleActionLineProps {
  label: string
  value: string
  isDisabled: boolean
  leftLabel: string
  rightLabel: string
  onChange: (value: string) => void
  onStep: (delta: number) => void
  onLeft: () => void
  onRight: () => void
}

export function TransformCard({
  glyph,
  selectedNodeIds,
  onMoveSelection,
  onPathOperation,
}: TransformCardProps) {
  const selectedNodes = useMemo(
    () => getSelectedNodes(glyph?.paths ?? [], selectedNodeIds),
    [glyph?.paths, selectedNodeIds]
  )
  const bounds = useMemo(
    () => getSelectionBounds(selectedNodes),
    [selectedNodes]
  )
  const selectedClosedPathIds = useMemo(() => {
    const selectedPathIds = new Set(
      selectedNodeIds.flatMap((selectionKey) => {
        const [pathId] = selectionKey.split(':')
        return pathId ? [pathId] : []
      })
    )
    return (glyph?.paths ?? [])
      .filter((path) => selectedPathIds.has(path.id) && path.closed)
      .map((path) => path.id)
  }, [glyph?.paths, selectedNodeIds])
  const [focusedField, setFocusedField] = useState<TransformField | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [origin, setOrigin] = useState<TransformOrigin>({
    x: 'center',
    y: 'middle',
  })
  const [isScaleLocked, setIsScaleLocked] = useState(true)
  const [actionDrafts, setActionDrafts] = useState<
    Record<TransformActionField, string>
  >({
    rotate: '15',
    scaleX: '110',
    scaleY: '110',
    skewX: '10',
    skewY: '10',
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

  const applyRotationStep = (direction: 1 | -1) => {
    if (!bounds || selectedNodes.length === 0) {
      return
    }

    const amount = Number.parseFloat(actionDrafts.rotate)
    if (!Number.isFinite(amount) || amount === 0) {
      return
    }

    onMoveSelection(
      buildRotatedUpdates(selectedNodes, bounds, amount * direction, origin)
    )
  }

  const applyScaleStep = (axis: ScaleAxis, direction: 1 | -1) => {
    if (!bounds || selectedNodes.length === 0) {
      return
    }

    const field = axis === 'x' ? 'scaleX' : 'scaleY'
    const amount = Number.parseFloat(actionDrafts[field])
    if (!Number.isFinite(amount) || amount <= 0 || amount === 100) {
      return
    }

    const factor = direction === 1 ? amount / 100 : 100 / amount
    const scaleX = isScaleLocked || axis === 'x' ? factor : 1
    const scaleY = isScaleLocked || axis === 'y' ? factor : 1
    onMoveSelection(
      buildScaledUpdates(selectedNodes, bounds, scaleX, scaleY, origin)
    )
  }

  const applySkewStep = (axis: SkewAxis, direction: 1 | -1) => {
    if (!bounds || selectedNodes.length === 0) {
      return
    }

    const field = axis === 'x' ? 'skewX' : 'skewY'
    const amount = Number.parseFloat(actionDrafts[field])
    if (!Number.isFinite(amount) || amount === 0) {
      return
    }

    onMoveSelection(
      buildSkewedUpdates(
        selectedNodes,
        bounds,
        axis === 'x' ? amount * direction : 0,
        axis === 'y' ? amount * direction : 0,
        origin
      )
    )
  }

  const setActionDraft = (field: TransformActionField, value: string) => {
    setActionDrafts((current) => ({ ...current, [field]: value }))
  }

  const stepActionDraft = (field: TransformActionField, delta: number) => {
    setActionDrafts((current) => {
      const fallback = field === 'scaleX' || field === 'scaleY' ? '100' : '0'
      const nextValue = String(
        parseTransformNumber(current[field] || fallback) + delta
      )
      if (isScaleLocked && (field === 'scaleX' || field === 'scaleY')) {
        return {
          ...current,
          scaleX: nextValue,
          scaleY: nextValue,
        }
      }
      return {
        ...current,
        [field]: nextValue,
      }
    })
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
  const canApplyPathOps = selectedClosedPathIds.length >= 2
  const pathActions: Array<{
    icon: typeof Union
    label: string
    operation: PathBooleanOperation
  }> = [
    { icon: Union, label: 'Union', operation: 'union' },
    { icon: Substract, label: 'Subtract', operation: 'subtract' },
    { icon: Intersect, label: 'Intersect', operation: 'intersect' },
    { icon: Cut, label: 'Divide', operation: 'divide' },
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

        <Stack spacing={3}>
          <ScaleActionGroup
            scaleX={actionDrafts.scaleX}
            scaleY={actionDrafts.scaleY}
            isDisabled={isDisabled}
            isScaleLocked={isScaleLocked}
            onScaleXChange={(value) => {
              setActionDraft('scaleX', value)
              if (isScaleLocked) setActionDraft('scaleY', value)
            }}
            onScaleYChange={(value) => {
              setActionDraft('scaleY', value)
              if (isScaleLocked) setActionDraft('scaleX', value)
            }}
            onScaleXStep={(delta) => stepActionDraft('scaleX', delta)}
            onScaleYStep={(delta) => stepActionDraft('scaleY', delta)}
            onScaleXDown={() => applyScaleStep('x', -1)}
            onScaleXUp={() => applyScaleStep('x', 1)}
            onScaleYDown={() => applyScaleStep('y', -1)}
            onScaleYUp={() => applyScaleStep('y', 1)}
            onToggleLock={() => setIsScaleLocked((current) => !current)}
          />
          <ActionRow
            label="Rotate"
            value={actionDrafts.rotate}
            unit="deg"
            isDisabled={isDisabled}
            leftLabel="Rotate counterclockwise"
            rightLabel="Rotate clockwise"
            leftIcon={
              <Refresh
                width={16}
                height={16}
                style={{ transform: 'scaleX(-1)' }}
              />
            }
            rightIcon={<Refresh width={16} height={16} />}
            onChange={(value) => setActionDraft('rotate', value)}
            onStep={(delta) => stepActionDraft('rotate', delta)}
            onLeft={() => applyRotationStep(-1)}
            onRight={() => applyRotationStep(1)}
          />
          <ActionRow
            label="Skew X"
            value={actionDrafts.skewX}
            unit="deg"
            isDisabled={isDisabled}
            leftLabel="Skew X negative"
            rightLabel="Skew X positive"
            leftIcon={<SkewIcon axis="x" direction={-1} />}
            rightIcon={<SkewIcon axis="x" direction={1} />}
            onChange={(value) => setActionDraft('skewX', value)}
            onStep={(delta) => stepActionDraft('skewX', delta)}
            onLeft={() => applySkewStep('x', -1)}
            onRight={() => applySkewStep('x', 1)}
          />
          <ActionRow
            label="Skew Y"
            value={actionDrafts.skewY}
            unit="deg"
            isDisabled={isDisabled}
            leftLabel="Skew Y negative"
            rightLabel="Skew Y positive"
            leftIcon={<SkewIcon axis="y" direction={1} />}
            rightIcon={<SkewIcon axis="y" direction={-1} />}
            onChange={(value) => setActionDraft('skewY', value)}
            onStep={(delta) => stepActionDraft('skewY', delta)}
            onLeft={() => applySkewStep('y', -1)}
            onRight={() => applySkewStep('y', 1)}
          />
        </Stack>

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
                leftIcon={
                  <Flip width={16} height={16} transform="rotate(-90)" />
                }
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
              {canApplyPathOps
                ? `${selectedClosedPathIds.length} paths`
                : 'select 2 closed paths'}
            </Text>
          </HStack>
          <Grid templateColumns="repeat(4, minmax(0, 1fr))" gap={2}>
            {pathActions.map(({ icon: Icon, label, operation }) => (
              <Tooltip key={label} label={label}>
                <IconButton
                  aria-label={label}
                  icon={<Icon width={16} height={16} />}
                  size="sm"
                  variant="outline"
                  isDisabled={!canApplyPathOps}
                  onClick={() =>
                    onPathOperation(operation, selectedClosedPathIds)
                  }
                />
              </Tooltip>
            ))}
          </Grid>
        </Stack>
      </Stack>
    </Box>
  )
}

function ActionRow({
  label,
  value,
  unit,
  isDisabled,
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  onChange,
  onStep,
  onLeft,
  onRight,
}: ActionRowProps) {
  return (
    <Box>
      <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
        {label}
      </Text>
      <Grid templateColumns="32px 88px 32px" gap={1} justifyContent="center">
        <Tooltip label={leftLabel}>
          <IconButton
            aria-label={leftLabel}
            icon={leftIcon}
            size="sm"
            minW="32px"
            variant="outline"
            isDisabled={isDisabled}
            onClick={onLeft}
          />
        </Tooltip>
        <ActionValueInput
          value={value}
          unit={unit}
          isDisabled={isDisabled}
          onChange={onChange}
          onStep={onStep}
        />
        <Tooltip label={rightLabel}>
          <IconButton
            aria-label={rightLabel}
            icon={rightIcon}
            size="sm"
            minW="32px"
            variant="outline"
            isDisabled={isDisabled}
            onClick={onRight}
          />
        </Tooltip>
      </Grid>
    </Box>
  )
}

function ScaleActionGroup({
  scaleX,
  scaleY,
  isDisabled,
  isScaleLocked,
  onScaleXChange,
  onScaleYChange,
  onScaleXStep,
  onScaleYStep,
  onScaleXDown,
  onScaleXUp,
  onScaleYDown,
  onScaleYUp,
  onToggleLock,
}: ScaleActionGroupProps) {
  const isScaleYDisabled = isDisabled || isScaleLocked

  return (
    <Box position="relative">
      <Stack spacing={2}>
        <ScaleActionLine
          label="Scale X"
          value={scaleX}
          isDisabled={isDisabled}
          leftLabel="Scale down X"
          rightLabel="Scale up X"
          onChange={onScaleXChange}
          onStep={onScaleXStep}
          onLeft={onScaleXDown}
          onRight={onScaleXUp}
        />
        <ScaleActionLine
          label="Scale Y"
          value={scaleY}
          isDisabled={isScaleYDisabled}
          leftLabel="Scale down Y"
          rightLabel="Scale up Y"
          onChange={onScaleYChange}
          onStep={onScaleYStep}
          onLeft={onScaleYDown}
          onRight={onScaleYUp}
        />
      </Stack>
      <Tooltip
        label={
          isScaleLocked
            ? 'Unlock proportional scale'
            : 'Lock proportional scale'
        }
      >
        <IconButton
          aria-label={
            isScaleLocked
              ? 'Unlock proportional scale'
              : 'Lock proportional scale'
          }
          icon={<Lock width={16} height={16} />}
          position="absolute"
          right="0"
          top="50%"
          size="sm"
          minW="32px"
          variant={isScaleLocked ? 'solid' : 'outline'}
          isDisabled={isDisabled}
          onClick={onToggleLock}
        />
      </Tooltip>
    </Box>
  )
}

function ScaleActionLine({
  label,
  value,
  isDisabled,
  leftLabel,
  rightLabel,
  onChange,
  onStep,
  onLeft,
  onRight,
}: ScaleActionLineProps) {
  return (
    <Box>
      <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
        {label}
      </Text>
      <Grid templateColumns="32px 88px 32px" gap={1} justifyContent="center">
        <Tooltip label={leftLabel}>
          <IconButton
            aria-label={leftLabel}
            icon={<ScaleFrameReduce width={16} height={16} />}
            size="sm"
            minW="32px"
            variant="outline"
            isDisabled={isDisabled}
            onClick={onLeft}
          />
        </Tooltip>
        <ActionValueInput
          value={value}
          unit="%"
          isDisabled={isDisabled}
          onChange={onChange}
          onStep={onStep}
        />
        <Tooltip label={rightLabel}>
          <IconButton
            aria-label={rightLabel}
            icon={<ScaleFrameEnlarge width={16} height={16} />}
            size="sm"
            minW="32px"
            variant="outline"
            isDisabled={isDisabled}
            onClick={onRight}
          />
        </Tooltip>
      </Grid>
    </Box>
  )
}

function ActionValueInput({
  value,
  unit,
  isDisabled,
  onChange,
  onStep,
}: {
  value: string
  unit: string
  isDisabled: boolean
  onChange: (value: string) => void
  onStep: (delta: number) => void
}) {
  const handleStep = (direction: 1 | -1) => {
    onStep(direction)
  }

  return (
    <Box position="relative">
      <Input
        size="sm"
        type="number"
        textAlign="center"
        pr="42px"
        value={value}
        isDisabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      <Text
        position="absolute"
        top="50%"
        right="25px"
        transform="translateY(-50%)"
        fontSize="10px"
        color="field.muted"
        pointerEvents="none"
      >
        {unit}
      </Text>
      <Box
        position="absolute"
        top="1px"
        right="1px"
        bottom="1px"
        w="18px"
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
          aria-label="Increment action value"
          fontSize="7px"
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
          aria-label="Decrement action value"
          fontSize="7px"
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

function SkewIcon({ axis, direction }: { axis: SkewAxis; direction: 1 | -1 }) {
  const rotation = axis === 'y' ? 90 : 0
  const scale = direction === -1 ? -1 : 1

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 1 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rotation}deg) scaleX(${scale})` }}
      aria-hidden="true"
    >
      <path d="M5.5 3.5h6l-3 9h-6l3-9Z" />
    </svg>
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
