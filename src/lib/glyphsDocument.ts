export type OpenStepScalar = string | number | boolean | null
export type OpenStepValue =
  | OpenStepScalar
  | OpenStepValue[]
  | { [key: string]: OpenStepValue | undefined }

export type GlyphsDocument = {
  [key: string]: OpenStepValue | undefined
  glyphs?: Array<Record<string, OpenStepValue | undefined>>
  fontMaster?: Array<Record<string, OpenStepValue | undefined>>
  customParameters?: OpenStepValue[]
  featurePrefixes?: OpenStepValue[]
  classes?: OpenStepValue[]
  features?: OpenStepValue[]
  instances?: OpenStepValue[]
}

export const cloneGlyphsDocument = <T extends OpenStepValue>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export const extractGlyphsMetadata = (
  document: GlyphsDocument | null | undefined
): Record<string, unknown> | null => {
  if (!document) {
    return null
  }

  return {
    familyName: document.familyName ?? null,
    unitsPerEm: document.unitsPerEm ?? null,
    versionMajor: document.versionMajor ?? null,
    versionMinor: document.versionMinor ?? null,
    customParameters: document.customParameters ?? null,
    featurePrefixes: document.featurePrefixes ?? null,
    classes: document.classes ?? null,
    features: document.features ?? null,
    instances: document.instances ?? null,
    fontMasters: document.fontMaster ?? null,
  }
}
