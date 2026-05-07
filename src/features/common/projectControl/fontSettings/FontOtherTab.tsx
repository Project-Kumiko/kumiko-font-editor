import {
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import type {
  DevelopmentStatusDefinition,
  FontProjectSettings,
} from 'src/store'
import { NumberField } from 'src/features/common/projectControl/fontSettings/fields'
import {
  parseInteger,
  parseNumber,
} from 'src/features/common/projectControl/fontSettings/model'

interface FontOtherTabProps {
  fontType: NonNullable<FontProjectSettings['fontType']>
  outlineType: NonNullable<FontProjectSettings['outlineType']>
  statusDefinitions: DevelopmentStatusDefinition[]
  onFontTypeChange: (
    value: NonNullable<FontProjectSettings['fontType']>
  ) => void
  onOutlineTypeChange: (
    value: NonNullable<FontProjectSettings['outlineType']>
  ) => void
  onStatusDefinitionsChange: (
    statusDefinitions: DevelopmentStatusDefinition[]
  ) => void
}

export function FontOtherTab({
  fontType,
  outlineType,
  statusDefinitions,
  onFontTypeChange,
  onOutlineTypeChange,
  onStatusDefinitionsChange,
}: FontOtherTabProps) {
  const updateStatus = (
    index: number,
    update: Partial<DevelopmentStatusDefinition>
  ) => {
    onStatusDefinitionsChange(
      statusDefinitions.map((status, statusIndex) =>
        statusIndex === index ? { ...status, ...update } : status
      )
    )
  }

  return (
    <Stack spacing={5}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">Font type</FormLabel>
          <Select
            value={fontType}
            onChange={(event) =>
              onFontTypeChange(
                event.target.value === 'variable' ? 'variable' : 'static'
              )
            }
          >
            <option value="static">一般</option>
            <option value="variable">可變</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Outline type</FormLabel>
          <Select
            value={outlineType}
            onChange={(event) =>
              onOutlineTypeChange(
                event.target.value === 'quadratic' ? 'quadratic' : 'cubic'
              )
            }
          >
            <option value="cubic">Cubic</option>
            <option value="quadratic">Quadratic</option>
          </Select>
        </FormControl>
      </SimpleGrid>

      <HStack justify="space-between">
        <Text fontWeight="semibold">Status definitions</Text>
        <Button
          size="sm"
          onClick={() =>
            onStatusDefinitionsChange([
              ...statusDefinitions,
              {
                value: statusDefinitions.length,
                label: `Status ${statusDefinitions.length}`,
                color: [1, 0, 0, 1],
              },
            ])
          }
        >
          新增
        </Button>
      </HStack>
      <Stack spacing={3}>
        {statusDefinitions.map((status, index) => (
          <SimpleGrid
            key={`${status.value}-${index}`}
            columns={{ base: 1, lg: 5 }}
            spacing={3}
          >
            <NumberField
              label="Value"
              min={0}
              value={status.value}
              onChange={(value) =>
                updateStatus(index, {
                  value: parseInteger(value) ?? status.value,
                })
              }
            />
            <FormControl>
              <FormLabel fontSize="sm">Label</FormLabel>
              <Input
                value={status.label}
                onChange={(event) =>
                  updateStatus(index, { label: event.target.value })
                }
              />
            </FormControl>
            {[0, 1, 2, 3].map((colorIndex) => (
              <NumberField
                key={colorIndex}
                label={['R', 'G', 'B', 'A'][colorIndex] ?? ''}
                min={0}
                max={1}
                value={status.color[colorIndex]}
                onChange={(value) => {
                  const nextColor = [...status.color] as [
                    number,
                    number,
                    number,
                    number,
                  ]
                  nextColor[colorIndex] = parseNumber(value) ?? 0
                  updateStatus(index, { color: nextColor })
                }}
              />
            ))}
            <Checkbox
              alignSelf="end"
              isChecked={status.isDefault ?? false}
              onChange={(event) =>
                updateStatus(index, { isDefault: event.target.checked })
              }
            >
              Default
            </Checkbox>
          </SimpleGrid>
        ))}
      </Stack>
    </Stack>
  )
}
