import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import {
  generalFontInfoFields,
  openTypeFontInfoSettings,
} from 'src/lib/fontInfoSettings'
import type { FontAxis } from 'src/store'
import { NumberField } from 'src/features/common/projectControl/fontSettings/fields'
import { LocalizedNamesEditor } from 'src/features/common/projectControl/fontSettings/LocalizedNamesEditor'
import {
  parseNumber,
  toArrayDraftValue,
  toDraftValue,
  type FontInfoDraft,
  type OpenTypeDraft,
} from 'src/features/common/projectControl/fontSettings/model'

interface FontBasicsTabProps {
  axes: FontAxis[]
  customParametersText: string
  generalDraft: FontInfoDraft
  mappingsText: string
  openTypeDraft: OpenTypeDraft
  unitsPerEm: string
  localizedNames: Record<string, Record<string, string>>
  onAxesChange: (axes: FontAxis[]) => void
  onCustomParametersTextChange: (value: string) => void
  onGeneralDraftChange: (draft: FontInfoDraft) => void
  onMappingsTextChange: (value: string) => void
  onOpenTypeDraftChange: (draft: OpenTypeDraft) => void
  onUnitsPerEmChange: (value: string) => void
  onLocalizedNamesChange: (
    localizedNames: Record<string, Record<string, string>>
  ) => void
}

export function FontBasicsTab({
  axes,
  customParametersText,
  generalDraft,
  mappingsText,
  openTypeDraft,
  unitsPerEm,
  localizedNames,
  onAxesChange,
  onCustomParametersTextChange,
  onGeneralDraftChange,
  onMappingsTextChange,
  onOpenTypeDraftChange,
  onUnitsPerEmChange,
  onLocalizedNamesChange,
}: FontBasicsTabProps) {
  const updateAxis = (index: number, update: Partial<FontAxis>) => {
    onAxesChange(
      axes.map((axis, axisIndex) =>
        axisIndex === index ? { ...axis, ...update } : axis
      )
    )
  }

  return (
    <Stack spacing={6}>
      <Box>
        <Text fontWeight="semibold" mb={3}>
          一般
        </Text>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {generalFontInfoFields.map((field) =>
            field.type === 'number' ? (
              <NumberField
                key={field.key}
                label={field.label}
                min={field.min}
                value={generalDraft[field.key]}
                onChange={(value) =>
                  onGeneralDraftChange({ ...generalDraft, [field.key]: value })
                }
              />
            ) : (
              <FormControl key={field.key}>
                <FormLabel fontSize="sm">{field.label}</FormLabel>
                <Input
                  maxW={field.width}
                  value={generalDraft[field.key]}
                  onChange={(event) =>
                    onGeneralDraftChange({
                      ...generalDraft,
                      [field.key]: event.target.value,
                    })
                  }
                />
              </FormControl>
            )
          )}
          <NumberField
            label="Units Per Em"
            min={1}
            value={unitsPerEm}
            onChange={onUnitsPerEmChange}
          />
        </SimpleGrid>
      </Box>

      <Box>
        <Text fontWeight="semibold" mb={3}>
          本地化名稱
        </Text>
        <LocalizedNamesEditor
          localizedNames={localizedNames}
          onChange={onLocalizedNamesChange}
        />
      </Box>

      <Box>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="semibold">變化軸</Text>
          <Button
            size="sm"
            onClick={() =>
              onAxesChange([
                ...axes,
                {
                  name: 'weight',
                  label: 'Weight',
                  tag: 'wght',
                  minValue: 100,
                  defaultValue: 400,
                  maxValue: 900,
                },
              ])
            }
          >
            新增
          </Button>
        </HStack>
        <Stack spacing={3}>
          {axes.map((axis, index) => (
            <Box key={`${axis.name}-${index}`} borderWidth="1px" p={3}>
              <SimpleGrid columns={{ base: 1, lg: 6 }} spacing={3}>
                <FormControl>
                  <FormLabel fontSize="sm">Name</FormLabel>
                  <Input
                    value={axis.name}
                    onChange={(event) =>
                      updateAxis(index, { name: event.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Tag</FormLabel>
                  <Input
                    value={axis.tag}
                    maxLength={4}
                    onChange={(event) =>
                      updateAxis(index, { tag: event.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Label</FormLabel>
                  <Input
                    value={axis.label}
                    onChange={(event) =>
                      updateAxis(index, { label: event.target.value })
                    }
                  />
                </FormControl>
                {(['minValue', 'defaultValue', 'maxValue'] as const).map(
                  (key) => (
                    <NumberField
                      key={key}
                      label={key}
                      value={axis[key]}
                      onChange={(value) =>
                        updateAxis(index, {
                          [key]: parseNumber(value) ?? axis[key],
                        })
                      }
                    />
                  )
                )}
              </SimpleGrid>
              <HStack mt={3} justify="space-between">
                <Checkbox
                  isChecked={axis.hidden ?? false}
                  onChange={(event) =>
                    updateAxis(index, { hidden: event.target.checked })
                  }
                >
                  Hidden
                </Checkbox>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onAxesChange(
                      axes.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  移除
                </Button>
              </HStack>
            </Box>
          ))}
        </Stack>
      </Box>

      <FormControl>
        <FormLabel fontSize="sm">Cross-axis mapping</FormLabel>
        <Textarea
          minH="140px"
          fontFamily="mono"
          value={mappingsText}
          onChange={(event) => onMappingsTextChange(event.target.value)}
        />
      </FormControl>

      <Box>
        <Text fontWeight="semibold" mb={3}>
          OpenType settings
        </Text>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {openTypeFontInfoSettings.map((setting) =>
            setting.type === 'number' ? (
              <NumberField
                key={setting.key}
                label={setting.label}
                min={setting.min}
                max={setting.max}
                value={openTypeDraft[setting.key]}
                onChange={(value) =>
                  onOpenTypeDraftChange({
                    ...openTypeDraft,
                    [setting.key]: value,
                  })
                }
              />
            ) : (
              <FormControl key={setting.key}>
                <FormLabel fontSize="sm">{setting.label}</FormLabel>
                <Input
                  value={openTypeDraft[setting.key]}
                  placeholder={
                    setting.type === 'array'
                      ? toArrayDraftValue(setting.defaultValue)
                      : toDraftValue(setting.defaultValue)
                  }
                  onChange={(event) =>
                    onOpenTypeDraftChange({
                      ...openTypeDraft,
                      [setting.key]: event.target.value,
                    })
                  }
                />
              </FormControl>
            )
          )}
        </SimpleGrid>
      </Box>

      <FormControl>
        <FormLabel fontSize="sm">自定參數</FormLabel>
        <Textarea
          minH="160px"
          fontFamily="mono"
          value={customParametersText}
          onChange={(event) => onCustomParametersTextChange(event.target.value)}
        />
      </FormControl>
    </Stack>
  )
}
