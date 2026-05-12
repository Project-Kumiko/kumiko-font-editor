import { Badge, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import {
  deriveOpenTypeImportExportSummary,
  type OpenTypeFeaturesState,
} from 'src/lib/openTypeFeatures'

interface ImportExportOverviewProps {
  state: OpenTypeFeaturesState
}

export function ImportExportOverview({ state }: ImportExportOverviewProps) {
  const summary = deriveOpenTypeImportExportSummary(state)

  return (
    <Stack spacing={3}>
      <HStack justify="space-between" align="flex-start" gap={3}>
        <Stack spacing={1}>
          <Text fontWeight="semibold">Behavior Library / Export View</Text>
          <Text fontSize="sm" color="field.muted">
            Imported tables are treated as preserved source material. Kumiko
            behavior edits are tracked separately and compiled according to the
            selected export policy.
          </Text>
        </Stack>
        <Badge colorScheme="cyan" flexShrink={0}>
          {summary.exportModeLabel}
        </Badge>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <OverviewTile
          accent="Imported"
          detail={`${summary.importedFeatures} features / ${summary.importedLookups} lookups`}
          label="Recognized"
          value={summary.importedRules}
        />
        <OverviewTile
          accent="Manual"
          detail={`${summary.manualFeatures} features / ${summary.manualLookups} lookups`}
          label="Editable"
          value={summary.manualRules}
        />
        <OverviewTile
          accent="Generated"
          detail={`${summary.generatedLookups} lookups`}
          label="Auto"
          value={summary.generatedRules}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <StatusLine label="Editable lookups" value={summary.editableLookups} />
        <StatusLine
          label="Preserved raw lookups"
          value={summary.preservedLookups}
        />
        <StatusLine
          label="Unsupported lookups"
          value={summary.unsupportedLookups}
          tone={summary.unsupportedLookups > 0 ? 'orange' : 'gray'}
        />
      </SimpleGrid>

      <Text fontSize="sm" color="field.muted">
        {summary.exportModeDescription}
      </Text>
    </Stack>
  )
}

function OverviewTile({
  accent,
  detail,
  label,
  value,
}: {
  accent: string
  detail: string
  label: string
  value: number
}) {
  return (
    <Stack borderWidth="1px" borderRadius="sm" p={3} spacing={2}>
      <HStack justify="space-between">
        <Text fontSize="xs" color="field.muted">
          {label}
        </Text>
        <Badge variant="subtle">{accent}</Badge>
      </HStack>
      <Text fontSize="2xl" fontWeight="900">
        {value}
      </Text>
      <Text fontSize="xs" color="field.muted">
        {detail}
      </Text>
    </Stack>
  )
}

function StatusLine({
  label,
  tone = 'gray',
  value,
}: {
  label: string
  tone?: string
  value: number
}) {
  return (
    <HStack
      justify="space-between"
      borderWidth="1px"
      borderRadius="sm"
      px={3}
      py={2}
    >
      <Text fontSize="sm" color="field.muted">
        {label}
      </Text>
      <Badge colorScheme={tone}>{value}</Badge>
    </HStack>
  )
}
