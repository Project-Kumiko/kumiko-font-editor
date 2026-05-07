export interface GlyphAdditionCandidate {
  id: string
  name: string
  unicode: string | null
  recipe?: string
}

const MAX_RANGE_GLYPHS = 5000

const NAMED_GLYPH_UNICODE: Record<string, string> = {
  space: '0020',
  exclam: '0021',
  quotedbl: '0022',
  numbersign: '0023',
  dollar: '0024',
  percent: '0025',
  ampersand: '0026',
  quotesingle: '0027',
  parenleft: '0028',
  parenright: '0029',
  asterisk: '002A',
  plus: '002B',
  comma: '002C',
  hyphen: '002D',
  period: '002E',
  slash: '002F',
  zero: '0030',
  one: '0031',
  two: '0032',
  three: '0033',
  four: '0034',
  five: '0035',
  six: '0036',
  seven: '0037',
  eight: '0038',
  nine: '0039',
  colon: '003A',
  semicolon: '003B',
  less: '003C',
  equal: '003D',
  greater: '003E',
  question: '003F',
  at: '0040',
  bracketleft: '005B',
  backslash: '005C',
  bracketright: '005D',
  asciicircum: '005E',
  underscore: '005F',
  grave: '0060',
  braceleft: '007B',
  bar: '007C',
  braceright: '007D',
  asciitilde: '007E',
}

const formatUnicodeHex = (codePoint: number) =>
  codePoint <= 0xffff
    ? codePoint.toString(16).toUpperCase().padStart(4, '0')
    : codePoint.toString(16).toUpperCase()

const buildGlyphIdFromChar = (character: string) => {
  const codePoint = character.codePointAt(0)
  if (!codePoint) {
    return null
  }

  if (/^[A-Za-z0-9]$/.test(character)) {
    return character
  }

  return codePoint <= 0xffff
    ? `uni${formatUnicodeHex(codePoint)}`
    : `u${formatUnicodeHex(codePoint)}`
}

const getUnicodeFromGlyphName = (glyphName: string) => {
  if (glyphName.length === 1) {
    return formatUnicodeHex(glyphName.codePointAt(0) ?? 0)
  }

  const uniMatch = glyphName.match(/^uni([0-9a-fA-F]{4,6})$/)
  if (uniMatch?.[1]) {
    return uniMatch[1].toUpperCase()
  }

  const uMatch = glyphName.match(/^u([0-9a-fA-F]{5,6})$/)
  if (uMatch?.[1]) {
    return uMatch[1].toUpperCase()
  }

  return NAMED_GLYPH_UNICODE[glyphName] ?? null
}

const isGlyphName = (token: string) =>
  /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(token)

const createGlyphNameCandidate = (
  glyphName: string,
  recipe?: string
): GlyphAdditionCandidate => ({
  id: glyphName,
  name: glyphName,
  unicode: getUnicodeFromGlyphName(glyphName),
  ...(recipe ? { recipe } : {}),
})

const createCharacterCandidates = (token: string) =>
  Array.from(token).flatMap((character): GlyphAdditionCandidate[] => {
    const id = buildGlyphIdFromChar(character)
    const codePoint = character.codePointAt(0)
    if (!id || !codePoint || /\s/.test(character)) {
      return []
    }

    return [
      {
        id,
        name: character,
        unicode: formatUnicodeHex(codePoint),
      },
    ]
  })

const parseUnicodeRange = (token: string) => {
  const match = token.match(
    /^(uni|u)([0-9a-fA-F]{4,6}):(uni|u)([0-9a-fA-F]{4,6})$/
  )
  if (!match?.[2] || !match[4]) {
    return null
  }

  const start = Number.parseInt(match[2], 16)
  const end = Number.parseInt(match[4], 16)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null
  }

  const count = end - start + 1
  if (count > MAX_RANGE_GLYPHS) {
    return null
  }

  return Array.from({ length: count }, (_, index) => {
    const codePoint = start + index
    const unicode = formatUnicodeHex(codePoint)
    return createGlyphNameCandidate(
      codePoint <= 0xffff ? `uni${unicode}` : `u${unicode}`
    )
  })
}

const parseRecipe = (token: string) => {
  const [source, target, extra] = token.split('=')
  if (!source || !target || extra !== undefined || !isGlyphName(target)) {
    return null
  }

  const sourceGlyphNames = source.split('+')
  if (
    sourceGlyphNames.length === 0 ||
    !sourceGlyphNames.every((glyphName) => isGlyphName(glyphName))
  ) {
    return null
  }

  return [createGlyphNameCandidate(target, source)]
}

const parseGlyphToken = (token: string): GlyphAdditionCandidate[] => {
  const rangeCandidates = parseUnicodeRange(token)
  if (rangeCandidates) {
    return rangeCandidates
  }

  const recipeCandidates = parseRecipe(token)
  if (recipeCandidates) {
    return recipeCandidates
  }

  if (isGlyphName(token)) {
    return [createGlyphNameCandidate(token)]
  }

  return createCharacterCandidates(token)
}

export const parseGlyphAdditionInput = (input: string) => {
  const results: GlyphAdditionCandidate[] = []
  const seen = new Set<string>()

  for (const token of input.split(/\s+/).filter(Boolean)) {
    for (const candidate of parseGlyphToken(token)) {
      if (seen.has(candidate.id)) {
        continue
      }

      results.push(candidate)
      seen.add(candidate.id)
    }
  }

  return results
}
