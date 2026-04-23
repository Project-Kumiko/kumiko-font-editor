/**
 * 高效能的 OpenStep PList Parser (專為處理巨量 .glyphs 檔案優化)
 * 解決了 @plist/openstep.parse 使用內部 JSON.parse 導致的：
 * 1. 控制字元 (Control Characters, \n) 解析崩潰問題
 * 2. .substring() 在 100MB+ 檔案中造成記憶體塞爆與凍結問題
 */

type OpenStepValue =
  | string
  | number
  | null
  | OpenStepValue[]
  | { [key: string]: OpenStepValue }

export function parseOpenStep(input: string): OpenStepValue {
  let pos = 0
  const len = input.length

  const isAlphaNum = (c: number) =>
    c > 32 &&
    c !== 0x7b /* { */ &&
    c !== 0x7d /* } */ &&
    c !== 0x28 /* ( */ &&
    c !== 0x29 /* ) */ &&
    c !== 0x3c /* < */ &&
    c !== 0x3e /* > */ &&
    c !== 0x3d /* = */ &&
    c !== 0x3b /* ; */ &&
    c !== 0x2c /* , */ &&
    c !== 0x22 /* " */ &&
    c !== 0x27 /* ' */

  function skipSpace() {
    while (pos < len) {
      const c = input.charCodeAt(pos)
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) {
        pos++
      } else if (c === 0x2f) {
        // '/'
        const next = input.charCodeAt(pos + 1)
        if (next === 0x2a) {
          // '/*'
          pos += 2
          const end = input.indexOf('*/', pos)
          pos = end === -1 ? len : end + 2
        } else if (next === 0x2f) {
          // '//'
          pos += 2
          const end = input.indexOf('\n', pos)
          pos = end === -1 ? len : end + 1
        } else {
          break
        }
      } else {
        break
      }
    }
  }

  function parseString(quote: number) {
    pos++ // skip quote
    let start = pos
    let res = ''
    while (pos < len) {
      const c = input.charCodeAt(pos)
      if (c === quote) {
        res += input.substring(start, pos)
        pos++
        return res
      } else if (c === 0x5c) {
        // '\'
        res += input.substring(start, pos)
        pos++ // skip slash
        if (pos >= len) break
        const escaped = input.charAt(pos)
        if (escaped === 'n') res += '\n'
        else if (escaped === 'r') res += '\r'
        else if (escaped === 't') res += '\t'
        else if (escaped === 'U') {
          // unicode \U1234
          const hex = input.substring(pos + 1, pos + 5)
          res += String.fromCharCode(parseInt(hex, 16) || 0)
          pos += 4
        } else res += escaped
        pos++
        start = pos
      } else {
        pos++
      }
    }
    return res
  }

  function parseValue(): OpenStepValue {
    skipSpace()
    if (pos >= len) return null
    const c = input.charCodeAt(pos)

    if (c === 0x7b) {
      // '{'
      pos++
      const obj: Record<string, OpenStepValue> = {}
      skipSpace()
      while (pos < len && input.charCodeAt(pos) !== 0x7d) {
        const key = parseValue()
        if (key === null) {
          // Error tolerance
          pos++
          continue
        }

        skipSpace()
        if (input.charCodeAt(pos) === 0x3d) pos++ // '='

        const val = parseValue()
        if (typeof key === 'string') {
          obj[key] = val
        }

        skipSpace()
        if (input.charCodeAt(pos) === 0x3b) pos++ // ';'
        skipSpace()
      }
      pos++ // '}'
      return obj
    } else if (c === 0x28) {
      // '('
      pos++
      const arr: OpenStepValue[] = []
      skipSpace()
      while (pos < len && input.charCodeAt(pos) !== 0x29) {
        const val = parseValue()
        if (val !== null) arr.push(val)
        skipSpace()
        if (input.charCodeAt(pos) === 0x2c) {
          pos++
          skipSpace()
        } // ','
      }
      pos++ // ')'
      return arr
    } else if (c === 0x22 || c === 0x27) {
      // '"' or "'"
      return parseString(c)
    } else if (c === 0x3c) {
      // '<'
      pos++
      const end = input.indexOf('>', pos)
      pos = end === -1 ? len : end + 1
      return null // ignore hex data
    } else {
      // unquoted string
      const start = pos
      while (pos < len && isAlphaNum(input.charCodeAt(pos))) {
        pos++
      }
      if (start === pos) {
        // Force advance to avoid infinite loop on syntax errors
        pos++
        return null
      }
      const str = input.substring(start, pos)
      if (!Number.isNaN(Number(str)) && str.trim() !== '') return Number(str)
      return str
    }
  }

  return parseValue()
}
