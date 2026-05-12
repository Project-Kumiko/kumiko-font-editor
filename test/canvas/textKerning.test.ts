import { describe, expect, it } from 'vitest'
import {
  createEmptyOpenTypeFeaturesState,
  upsertSpacingBehavior,
} from 'src/lib/openTypeFeatures'
import { getTextKerningValue } from 'src/features/editor/canvas/workspace/textKerning'
import type { FontData } from 'src/store'

describe('text kerning layout', () => {
  it('resolves active kern pair positioning from OpenType behavior state', () => {
    const openTypeFeatures = upsertSpacingBehavior(
      createEmptyOpenTypeFeaturesState(),
      {
        left: 'A',
        right: 'V',
        value: -80,
      }
    )
    const fontData = {
      glyphs: {},
      openTypeFeatures,
    } satisfies FontData

    expect(getTextKerningValue(fontData, 'A', 'V')).toBe(-80)
    expect(getTextKerningValue(fontData, 'V', 'A')).toBe(0)
  })
})
