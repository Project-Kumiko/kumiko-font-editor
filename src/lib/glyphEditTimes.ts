export type GlyphEditTimes = Record<string, number>

export const GLYPH_EDIT_TIMES_PROJECT_METADATA_KEY = 'kumikoGlyphEditTimes'
export const UFO_GLYPH_EDIT_TIMES_KEY = 'ufo-glyph-edit-times'

export const sanitizeGlyphEditTimes = (value: unknown): GlyphEditTimes => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, number] =>
          typeof entry[0] === 'string' &&
          typeof entry[1] === 'number' &&
          Number.isFinite(entry[1])
      )
      .map(([glyphId, editedAt]) => [glyphId, editedAt])
  )
}

export const getProjectGlyphEditTimes = (
  metadata: Record<string, unknown> | null | undefined
): GlyphEditTimes =>
  sanitizeGlyphEditTimes(metadata?.[GLYPH_EDIT_TIMES_PROJECT_METADATA_KEY])

export const withProjectGlyphEditTimes = (
  metadata: Record<string, unknown> | null | undefined,
  glyphEditTimes: GlyphEditTimes
): Record<string, unknown> => ({
  ...(metadata ?? {}),
  [GLYPH_EDIT_TIMES_PROJECT_METADATA_KEY]: glyphEditTimes,
})
