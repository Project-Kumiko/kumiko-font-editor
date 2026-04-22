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

export const parseGlyphAdditionInput = (input: string) => {
  const results: Array<{ id: string; name: string; unicode: string | null }> =
    []
  const seen = new Set<string>()
  const uniPattern = /uni([0-9a-fA-F]{4,6})/g
  const consumedRanges: Array<[number, number]> = []

  for (const match of input.matchAll(uniPattern)) {
    const hex = match[1]?.toUpperCase()
    const index = match.index ?? -1
    if (!hex || index < 0) {
      continue
    }
    const codePoint = Number.parseInt(hex, 16)
    if (!Number.isFinite(codePoint)) {
      continue
    }
    const id = `uni${hex}`
    const character = String.fromCodePoint(codePoint)
    if (!seen.has(id)) {
      results.push({ id, name: character, unicode: hex })
      seen.add(id)
    }
    consumedRanges.push([index, index + match[0].length])
  }

  const characters = Array.from(input)
  let cursor = 0
  for (const character of characters) {
    const start = cursor
    const end = cursor + character.length
    cursor = end
    const isConsumed = consumedRanges.some(
      ([rangeStart, rangeEnd]) => start >= rangeStart && end <= rangeEnd
    )
    if (isConsumed || /\s/.test(character)) {
      continue
    }
    const id = buildGlyphIdFromChar(character)
    const codePoint = character.codePointAt(0)
    if (!id || !codePoint || seen.has(id)) {
      continue
    }
    results.push({
      id,
      name: character,
      unicode: formatUnicodeHex(codePoint),
    })
    seen.add(id)
  }

  return results
}
