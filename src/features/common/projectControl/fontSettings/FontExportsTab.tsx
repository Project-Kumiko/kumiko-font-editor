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
} from '@chakra-ui/react'
import { NumberField } from 'src/features/common/projectControl/fontSettings/fields'
import {
  makeId,
  parseInteger,
  type ExportDraft,
} from 'src/features/common/projectControl/fontSettings/model'

interface FontExportsTabProps {
  exports: ExportDraft[]
  onExportsChange: (exports: ExportDraft[]) => void
}

export function FontExportsTab({
  exports,
  onExportsChange,
}: FontExportsTabProps) {
  const updateExport = (index: number, update: Partial<ExportDraft>) => {
    onExportsChange(
      exports.map((instance, instanceIndex) =>
        instanceIndex === index ? { ...instance, ...update } : instance
      )
    )
  }

  return (
    <Stack spacing={3}>
      <HStack justify="space-between">
        <Text fontWeight="semibold">Export instances</Text>
        <Button
          size="sm"
          onClick={() =>
            onExportsChange([
              ...exports,
              {
                id: makeId('instance'),
                name: `Instance ${exports.length + 1}`,
                styleName: 'Regular',
                location: {},
                locationText: '{}',
                export: true,
              },
            ])
          }
        >
          新增
        </Button>
      </HStack>
      {exports.map((instance, index) => (
        <Box key={instance.id} borderWidth="1px" p={3}>
          <SimpleGrid columns={{ base: 1, lg: 4 }} spacing={3}>
            <FormControl>
              <FormLabel fontSize="sm">Name</FormLabel>
              <Input
                value={instance.name}
                onChange={(event) =>
                  updateExport(index, { name: event.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Style name</FormLabel>
              <Input
                value={instance.styleName}
                onChange={(event) =>
                  updateExport(index, { styleName: event.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Location JSON</FormLabel>
              <Input
                fontFamily="mono"
                value={instance.locationText}
                onChange={(event) =>
                  updateExport(index, { locationText: event.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">File name</FormLabel>
              <Input
                value={instance.fileName ?? ''}
                onChange={(event) =>
                  updateExport(index, { fileName: event.target.value })
                }
              />
            </FormControl>
            <NumberField
              label="Weight class"
              min={1}
              max={1000}
              value={instance.weightClass}
              onChange={(value) =>
                updateExport(index, { weightClass: parseInteger(value) })
              }
            />
            <NumberField
              label="Width class"
              min={1}
              max={9}
              value={instance.widthClass}
              onChange={(value) =>
                updateExport(index, { widthClass: parseInteger(value) })
              }
            />
          </SimpleGrid>
          <HStack justify="space-between" mt={3}>
            <Checkbox
              isChecked={instance.export}
              onChange={(event) =>
                updateExport(index, { export: event.target.checked })
              }
            >
              Export
            </Checkbox>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onExportsChange(
                  exports.filter((_, itemIndex) => itemIndex !== index)
                )
              }
            >
              移除
            </Button>
          </HStack>
        </Box>
      ))}
    </Stack>
  )
}
