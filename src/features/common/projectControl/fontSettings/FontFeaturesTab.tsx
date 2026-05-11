import { Divider, Grid, GridItem, Stack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { AutoFeatureSuggestions } from 'src/features/common/projectControl/fontSettings/features/AutoFeatureSuggestions'
import { ExportPolicyControl } from 'src/features/common/projectControl/fontSettings/features/ExportPolicyControl'
import { FeatureClassesPanel } from 'src/features/common/projectControl/fontSettings/features/FeatureClassesPanel'
import { FeatureDetailPanel } from 'src/features/common/projectControl/fontSettings/features/FeatureDetailPanel'
import { FeatureDiagnosticsList } from 'src/features/common/projectControl/fontSettings/features/FeatureDiagnosticsList'
import { FeaturePreludePanel } from 'src/features/common/projectControl/fontSettings/features/FeaturePreludePanel'
import { FeatureSummary } from 'src/features/common/projectControl/fontSettings/features/FeatureSummary'
import {
  FeatureWorkbenchSidebar,
  type FeatureWorkbenchSelection,
} from 'src/features/common/projectControl/fontSettings/features/FeatureWorkbenchSidebar'
import { GeneratedFeaPreview } from 'src/features/common/projectControl/fontSettings/features/GeneratedFeaPreview'
import { updateLookupRule } from 'src/features/common/projectControl/fontSettings/features/ruleEditorState'
import { UnsupportedLookupList } from 'src/features/common/projectControl/fontSettings/features/UnsupportedLookupList'
import {
  applyAutoFeatureSuggestion,
  buildAutoFeatureSuggestions,
  generateFea,
  ignoreAutoFeatureSuggestion,
  validateFeatures,
  type AutoFeatureSuggestion,
  type ExportPolicy,
  type OpenTypeFeaturesState,
  type Rule,
} from 'src/lib/openTypeFeatures'
import type { FontData } from 'src/store'

interface FontFeaturesTabProps {
  fontData: FontData | null
  featuresText: string
  openTypeFeatures: OpenTypeFeaturesState
  onFeaturesTextChange: (value: string) => void
  onOpenTypeFeaturesChange: (value: OpenTypeFeaturesState) => void
}

export function FontFeaturesTab({
  fontData,
  featuresText,
  openTypeFeatures,
  onFeaturesTextChange,
  onOpenTypeFeaturesChange,
}: FontFeaturesTabProps) {
  const [selected, setSelected] = useState<FeatureWorkbenchSelection>({
    kind: 'prelude',
  })
  const diagnostics = useMemo(
    () => (fontData ? validateFeatures(openTypeFeatures, fontData) : []),
    [fontData, openTypeFeatures]
  )
  const generatedFea = useMemo(
    () => generateFea(openTypeFeatures),
    [openTypeFeatures]
  )
  const suggestions = useMemo(
    () =>
      fontData ? buildAutoFeatureSuggestions(fontData, openTypeFeatures) : [],
    [fontData, openTypeFeatures]
  )

  const acceptSuggestion = (suggestion: AutoFeatureSuggestion) => {
    onOpenTypeFeaturesChange(
      applyAutoFeatureSuggestion(openTypeFeatures, suggestion)
    )
  }

  const ignoreSuggestion = (suggestion: AutoFeatureSuggestion) => {
    onOpenTypeFeaturesChange(
      ignoreAutoFeatureSuggestion(openTypeFeatures, suggestion)
    )
  }

  const updateExportPolicy = (exportPolicy: ExportPolicy) => {
    onOpenTypeFeaturesChange({ ...openTypeFeatures, exportPolicy })
  }

  const updateRule = (lookupId: string, rule: Rule) => {
    onOpenTypeFeaturesChange(updateLookupRule(openTypeFeatures, lookupId, rule))
  }

  const selectedFeature =
    selected.kind === 'feature'
      ? (openTypeFeatures.features.find(
          (feature) => feature.id === selected.featureId
        ) ?? null)
      : null
  const activeSelection =
    selected.kind === 'feature' && !selectedFeature
      ? ({ kind: 'prelude' } as const)
      : selected

  return (
    <Stack spacing={5}>
      <FeatureSummary state={openTypeFeatures} diagnostics={diagnostics} />
      <Grid
        gap={5}
        templateColumns={{ base: '1fr', lg: '280px minmax(0, 1fr)' }}
      >
        <GridItem>
          <FeatureWorkbenchSidebar
            diagnostics={diagnostics}
            selected={activeSelection}
            state={openTypeFeatures}
            onSelect={setSelected}
          />
        </GridItem>
        <GridItem minW={0}>
          <Stack spacing={5}>
            {activeSelection.kind === 'classes' ? (
              <FeatureClassesPanel state={openTypeFeatures} />
            ) : selectedFeature ? (
              <FeatureDetailPanel
                diagnostics={diagnostics}
                feature={selectedFeature}
                state={openTypeFeatures}
                onRuleChange={updateRule}
              />
            ) : (
              <FeaturePreludePanel
                featuresText={featuresText}
                state={openTypeFeatures}
                onFeaturesTextChange={onFeaturesTextChange}
              />
            )}

            {activeSelection.kind === 'prelude' ? (
              <>
                <Divider />
                <ExportPolicyControl
                  state={openTypeFeatures}
                  onChange={updateExportPolicy}
                />
                <Divider />
                <AutoFeatureSuggestions
                  suggestions={suggestions}
                  onAccept={acceptSuggestion}
                  onIgnore={ignoreSuggestion}
                  onScan={() =>
                    onOpenTypeFeaturesChange({ ...openTypeFeatures })
                  }
                />
                <Divider />
                <UnsupportedLookupList
                  unsupportedLookups={openTypeFeatures.unsupportedLookups}
                />
                <Divider />
                <FeatureDiagnosticsList diagnostics={diagnostics} />
                <Divider />
                <GeneratedFeaPreview
                  feaText={generatedFea.text}
                  sourceMap={generatedFea.sourceMap}
                />
              </>
            ) : null}
          </Stack>
        </GridItem>
      </Grid>
    </Stack>
  )
}
