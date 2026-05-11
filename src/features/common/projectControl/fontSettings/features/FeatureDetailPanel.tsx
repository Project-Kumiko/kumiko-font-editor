import { Badge, HStack, Stack, Text } from '@chakra-ui/react'
import { LookupInspector } from 'src/features/common/projectControl/fontSettings/features/LookupInspector'
import type {
  FeatureDiagnostic,
  FeatureRecord,
  LookupRecord,
  OpenTypeFeaturesState,
  Rule,
} from 'src/lib/openTypeFeatures'

interface FeatureDetailPanelProps {
  diagnostics: FeatureDiagnostic[]
  feature: FeatureRecord
  state: OpenTypeFeaturesState
  onRuleChange: (lookupId: string, rule: Rule) => void
}

export function FeatureDetailPanel({
  diagnostics,
  feature,
  state,
  onRuleChange,
}: FeatureDetailPanelProps) {
  const lookups = getFeatureLookups(feature, state.lookups)

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" align="flex-start">
        <Stack spacing={1}>
          <HStack>
            <Text fontSize="lg" fontFamily="mono" fontWeight="900">
              {feature.tag}
            </Text>
            <Badge>{feature.origin}</Badge>
            {!feature.isActive ? (
              <Badge colorScheme="gray">inactive</Badge>
            ) : null}
          </HStack>
          <Text fontSize="sm" color="field.muted">
            Feature code is organized by script/language entries and the lookups
            they reference.
          </Text>
        </Stack>
      </HStack>

      <FeatureEntries feature={feature} lookups={state.lookups} />

      <LookupInspector
        state={state}
        lookups={lookups}
        title="Feature code lookups"
        emptyMessage="This feature does not reference any lookups."
        diagnostics={diagnostics}
        onRuleChange={onRuleChange}
      />
    </Stack>
  )
}

function FeatureEntries({
  feature,
  lookups,
}: {
  feature: FeatureRecord
  lookups: LookupRecord[]
}) {
  const lookupById = new Map(lookups.map((lookup) => [lookup.id, lookup]))

  return (
    <Stack spacing={2}>
      <Text fontSize="xs" fontWeight="900" color="field.muted">
        Script / Language Entries
      </Text>
      {feature.entries.map((entry) => (
        <Stack
          key={entry.id}
          spacing={2}
          borderWidth="1px"
          borderRadius="sm"
          p={3}
        >
          <HStack>
            <Badge fontFamily="mono">{entry.script}</Badge>
            <Badge fontFamily="mono">{entry.language}</Badge>
          </HStack>
          <HStack wrap="wrap">
            {entry.lookupIds.length === 0 ? (
              <Text fontSize="sm" color="field.muted">
                No referenced lookups.
              </Text>
            ) : (
              entry.lookupIds.map((lookupId) => {
                const lookup = lookupById.get(lookupId)
                return (
                  <Badge key={lookupId} fontFamily="mono">
                    {lookup?.name ?? lookupId}
                  </Badge>
                )
              })
            )}
          </HStack>
        </Stack>
      ))}
    </Stack>
  )
}

function getFeatureLookups(feature: FeatureRecord, lookups: LookupRecord[]) {
  const lookupById = new Map(lookups.map((lookup) => [lookup.id, lookup]))
  const seen = new Set<string>()
  const featureLookups: LookupRecord[] = []
  for (const lookupId of feature.entries.flatMap((entry) => entry.lookupIds)) {
    if (seen.has(lookupId)) continue
    const lookup = lookupById.get(lookupId)
    if (lookup) {
      featureLookups.push(lookup)
      seen.add(lookupId)
    }
  }
  return featureLookups
}
