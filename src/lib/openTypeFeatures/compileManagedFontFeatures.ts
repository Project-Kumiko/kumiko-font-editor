import { compileFontWithFeatures } from 'src/lib/openTypeFeatures/compileFontWithFeatures'
import { needsOpenTypeFeatureCompilationForBinaryExport } from 'src/lib/openTypeFeatures/exportPolicy'
import { generateFea } from 'src/lib/openTypeFeatures/generateFea'
import type {
  FeatureEntry,
  OpenTypeFeaturesState,
  Rule,
} from 'src/lib/openTypeFeatures/types'

const DEFAULT_AFFECTED_TABLES: Array<'GSUB' | 'GPOS' | 'GDEF'> = [
  'GSUB',
  'GPOS',
  'GDEF',
]

export const compileManagedFontFeatures = async (
  inputFontBuffer: ArrayBuffer,
  openTypeFeatures: OpenTypeFeaturesState | undefined,
  options: { preserveSourceFontBuffer?: ArrayBuffer } = {}
) => {
  if (
    !openTypeFeatures ||
    !needsOpenTypeFeatureCompilationForBinaryExport(openTypeFeatures)
  ) {
    return inputFontBuffer
  }

  const patchState = options.preserveSourceFontBuffer
    ? buildAdditivePatchState(openTypeFeatures)
    : openTypeFeatures
  const generated = generateFea(patchState)
  const result = await compileFontWithFeatures(
    inputFontBuffer,
    generated.text,
    {
      affectedTables: DEFAULT_AFFECTED_TABLES,
      preserveSourceFontBuffer: options.preserveSourceFontBuffer,
    },
    generated.sourceMap
  )

  return result.fontBuffer
}

function buildAdditivePatchState(
  state: OpenTypeFeaturesState
): OpenTypeFeaturesState {
  const patchLookups = state.lookups
    .map((lookup) => ({
      ...lookup,
      rules: lookup.rules.filter(isPatchRule),
    }))
    .filter((lookup) => lookup.rules.length > 0)
  const patchLookupIds = new Set(patchLookups.map((lookup) => lookup.id))

  return {
    ...state,
    rawPrelude: undefined,
    features: state.features
      .map((feature) => ({
        ...feature,
        entries: feature.entries
          .map((entry) => filterFeatureEntry(entry, patchLookupIds))
          .filter((entry) => entry.lookupIds.length > 0),
      }))
      .filter((feature) => feature.entries.length > 0),
    lookups: patchLookups,
    unsupportedLookups: [],
  }
}

function isPatchRule(rule: Rule) {
  return rule.meta.origin !== 'imported'
}

function filterFeatureEntry(entry: FeatureEntry, lookupIds: Set<string>) {
  return {
    ...entry,
    lookupIds: entry.lookupIds.filter((lookupId) => lookupIds.has(lookupId)),
  }
}
