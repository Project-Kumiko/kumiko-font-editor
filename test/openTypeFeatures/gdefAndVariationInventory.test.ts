import { describe, expect, it } from 'vitest'
import { extractBinaryFeatures } from 'src/lib/openTypeFeatures/extractBinaryFeatures'

interface TableFixture {
  tag: string
  data: Uint8Array
}

const TRUE_TYPE_SCALER = [0x00, 0x01, 0x00, 0x00]

const align4 = (value: number) => Math.ceil(value / 4) * 4

const writeTag = (view: DataView, offset: number, tag: string) => {
  for (let index = 0; index < 4; index += 1) {
    view.setUint8(offset + index, tag.charCodeAt(index))
  }
}

const writeUint16 = (view: DataView, offset: number, value: number) => {
  view.setUint16(offset, value, false)
}

const writeUint32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value, false)
}

const makeBytes = (length: number, write: (view: DataView) => void) => {
  const bytes = new Uint8Array(length)
  write(new DataView(bytes.buffer))
  return bytes
}

const makeSfnt = (tables: TableFixture[]) => {
  const directoryLength = 12 + tables.length * 16
  const tableOffsets: number[] = []
  let cursor = align4(directoryLength)

  for (const table of tables) {
    tableOffsets.push(cursor)
    cursor = align4(cursor + table.data.byteLength)
  }

  const bytes = new Uint8Array(cursor)
  const view = new DataView(bytes.buffer)
  TRUE_TYPE_SCALER.forEach((byte, index) => view.setUint8(index, byte))
  writeUint16(view, 4, tables.length)

  tables.forEach((table, index) => {
    const recordOffset = 12 + index * 16
    writeTag(view, recordOffset, table.tag)
    writeUint32(view, recordOffset + 4, 0)
    writeUint32(view, recordOffset + 8, tableOffsets[index])
    writeUint32(view, recordOffset + 12, table.data.byteLength)
    bytes.set(table.data, tableOffsets[index])
  })

  return bytes.buffer
}

const makeLookupTable = (
  tableTag: 'GSUB' | 'GPOS',
  lookupType: number,
  subtable: Uint8Array,
  withFeatureVariations = false
) => {
  const headerLength = withFeatureVariations ? 60 : 56
  const bytes = makeBytes(headerLength + subtable.byteLength, (view) => {
    writeUint16(view, 0, 1)
    writeUint16(view, 2, withFeatureVariations ? 1 : 0)
    writeUint16(view, 4, withFeatureVariations ? 14 : 10)
    writeUint16(view, 6, withFeatureVariations ? 34 : 30)
    writeUint16(view, 8, withFeatureVariations ? 48 : 44)
    if (withFeatureVariations) writeUint32(view, 10, headerLength)

    const scriptListOffset = withFeatureVariations ? 14 : 10
    const featureListOffset = withFeatureVariations ? 34 : 30
    const lookupListOffset = withFeatureVariations ? 48 : 44

    writeUint16(view, scriptListOffset, 1)
    writeTag(view, scriptListOffset + 2, 'latn')
    writeUint16(view, scriptListOffset + 6, 8)

    writeUint16(view, scriptListOffset + 8, 4)
    writeUint16(view, scriptListOffset + 10, 0)
    writeUint16(view, scriptListOffset + 12, 0)
    writeUint16(view, scriptListOffset + 14, 0xffff)
    writeUint16(view, scriptListOffset + 16, 1)
    writeUint16(view, scriptListOffset + 18, 0)

    writeUint16(view, featureListOffset, 1)
    writeTag(view, featureListOffset + 2, tableTag === 'GSUB' ? 'liga' : 'kern')
    writeUint16(view, featureListOffset + 6, 8)
    writeUint16(view, featureListOffset + 8, 0)
    writeUint16(view, featureListOffset + 10, 1)
    writeUint16(view, featureListOffset + 12, 0)

    writeUint16(view, lookupListOffset, 1)
    writeUint16(view, lookupListOffset + 2, 4)
    writeUint16(view, lookupListOffset + 4, lookupType)
    writeUint16(view, lookupListOffset + 6, 0)
    writeUint16(view, lookupListOffset + 8, 1)
    writeUint16(view, lookupListOffset + 10, 8)
  })
  bytes.set(subtable, headerLength)
  return bytes
}

const makeUnsupportedSubtable = () =>
  makeBytes(2, (view) => {
    writeUint16(view, 0, 99)
  })

const makeGdefTable = () =>
  makeBytes(64, (view) => {
    writeUint16(view, 0, 1)
    writeUint16(view, 2, 2)
    writeUint16(view, 4, 14)
    writeUint16(view, 6, 0)
    writeUint16(view, 8, 28)
    writeUint16(view, 10, 0)
    writeUint16(view, 12, 50)

    writeUint16(view, 14, 1)
    writeUint16(view, 16, 1)
    writeUint16(view, 18, 4)
    writeUint16(view, 20, 1)
    writeUint16(view, 22, 2)
    writeUint16(view, 24, 3)
    writeUint16(view, 26, 4)

    writeUint16(view, 28, 8)
    writeUint16(view, 30, 1)
    writeUint16(view, 32, 14)
    writeUint16(view, 36, 1)
    writeUint16(view, 38, 1)
    writeUint16(view, 40, 2)
    writeUint16(view, 42, 1)
    writeUint16(view, 44, 4)
    writeUint16(view, 46, 1)
    writeUint16(view, 48, 300)

    writeUint16(view, 50, 1)
    writeUint16(view, 52, 1)
    writeUint32(view, 54, 8)
    writeUint16(view, 58, 1)
    writeUint16(view, 60, 1)
    writeUint16(view, 62, 3)
  })

describe('GDEF and variation inventory', () => {
  it('imports straightforward GDEF glyph classes, mark glyph sets, and ligature carets', () => {
    const state = extractBinaryFeatures(
      makeSfnt([{ tag: 'GDEF', data: makeGdefTable() }]),
      null,
      ['.notdef', 'A', 'f_i', 'acutecomb', 'componentGlyph']
    )

    expect(state.gdef).toEqual({
      glyphClasses: {
        base: ['A'],
        ligature: ['f_i'],
        mark: ['acutecomb'],
        component: ['componentGlyph'],
      },
      markGlyphSets: [
        {
          id: 'gdef_mark_glyph_set_0',
          name: '@GDEFMarkGlyphSet0',
          glyphs: ['acutecomb'],
          origin: 'imported',
        },
      ],
      ligatureCarets: [{ glyph: 'f_i', carets: [300] }],
    })
    expect(state.diagnostics ?? []).toEqual([])
  })

  it('reports GSUB and GPOS FeatureVariations as explicit unsupported table-level data', () => {
    const state = extractBinaryFeatures(
      makeSfnt([
        {
          tag: 'GSUB',
          data: makeLookupTable('GSUB', 5, makeUnsupportedSubtable(), true),
        },
        {
          tag: 'GPOS',
          data: makeLookupTable('GPOS', 7, makeUnsupportedSubtable(), true),
        },
      ]),
      null,
      ['.notdef']
    )

    expect(
      (state.diagnostics ?? []).map((diagnostic) => diagnostic.id)
    ).toContain(
      'feature-diagnostic-warning-binary-extractor-gsub-feature-variations-present'
    )
    expect(
      (state.diagnostics ?? []).map((diagnostic) => diagnostic.id)
    ).toContain(
      'feature-diagnostic-warning-binary-extractor-gpos-feature-variations-present'
    )
  })

  it('keeps every GSUB and GPOS lookup type either editable or explicitly unsupported', () => {
    const cases = [
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((lookupType) => ({
        table: 'GSUB' as const,
        data: makeLookupTable('GSUB', lookupType, makeUnsupportedSubtable()),
        lookupType,
      })),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lookupType) => ({
        table: 'GPOS' as const,
        data: makeLookupTable('GPOS', lookupType, makeUnsupportedSubtable()),
        lookupType,
      })),
    ]

    for (const testCase of cases) {
      const state = extractBinaryFeatures(
        makeSfnt([{ tag: testCase.table, data: testCase.data }]),
        null,
        ['.notdef']
      )
      const lookup = state.lookups[0]
      const unsupportedLookup = state.unsupportedLookups.find(
        (item) => item.lookupIndex === 0 && item.table === testCase.table
      )

      expect(
        lookup,
        `${testCase.table} lookup type ${testCase.lookupType}`
      ).toBeDefined()
      expect(
        lookup.editable || unsupportedLookup !== undefined,
        `${testCase.table} lookup type ${testCase.lookupType}`
      ).toBe(true)
    }
  })
})
