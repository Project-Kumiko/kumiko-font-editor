/**
 * 高效能的 OpenStep PList Parser (專為處理巨量 .glyphs 檔案優化)
 * 解決了 @plist/openstep.parse 使用內部 JSON.parse 導致的：
 * 1. 控制字元 (Control Characters, \n) 解析崩潰問題
 * 2. .substring() 在 100MB+ 檔案中造成記憶體塞爆與凍結問題
 */

export function parseOpenStep(input: string): any {
  let pos = 0;
  const len = input.length;

  const isAlphaNum = (c: number) => 
    (c > 32 && 
     c !== 0x7B /* { */ && 
     c !== 0x7D /* } */ && 
     c !== 0x28 /* ( */ && 
     c !== 0x29 /* ) */ && 
     c !== 0x3C /* < */ && 
     c !== 0x3E /* > */ && 
     c !== 0x3D /* = */ && 
     c !== 0x3B /* ; */ && 
     c !== 0x2C /* , */ && 
     c !== 0x22 /* " */ && 
     c !== 0x27 /* ' */);

  function skipSpace() {
    while (pos < len) {
      const c = input.charCodeAt(pos);
      if (c === 0x20 || c === 0x09 || c === 0x0A || c === 0x0D) {
        pos++;
      } else if (c === 0x2F) { // '/'
        const next = input.charCodeAt(pos + 1);
        if (next === 0x2A) { // '/*'
          pos += 2;
          const end = input.indexOf('*/', pos);
          pos = end === -1 ? len : end + 2;
        } else if (next === 0x2F) { // '//'
          pos += 2;
          const end = input.indexOf('\n', pos);
          pos = end === -1 ? len : end + 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  function parseString(quote: number) {
    pos++; // skip quote
    let start = pos;
    let res = "";
    while (pos < len) {
      let c = input.charCodeAt(pos);
      if (c === quote) {
        res += input.substring(start, pos);
        pos++;
        return res;
      } else if (c === 0x5C) { // '\'
        res += input.substring(start, pos);
        pos++; // skip slash
        if (pos >= len) break;
        const escaped = input.charAt(pos);
        if (escaped === 'n') res += '\n';
        else if (escaped === 'r') res += '\r';
        else if (escaped === 't') res += '\t';
        else if (escaped === 'U') {
           // unicode \U1234
           const hex = input.substring(pos+1, pos+5);
           res += String.fromCharCode(parseInt(hex, 16) || 0);
           pos += 4;
        }
        else res += escaped;
        pos++;
        start = pos;
      } else {
        pos++;
      }
    }
    return res;
  }

  function parseValue(): any {
    skipSpace();
    if (pos >= len) return null;
    const c = input.charCodeAt(pos);
    
    if (c === 0x7B) { // '{'
      pos++;
      const obj: any = {};
      skipSpace();
      while (pos < len && input.charCodeAt(pos) !== 0x7D) {
        const key = parseValue();
        if (key === null) {
            // Error tolerance
            pos++;
            continue;
        }
        
        skipSpace();
        if (input.charCodeAt(pos) === 0x3D) pos++; // '='
        
        const val = parseValue();
        if (typeof key === 'string') {
           obj[key] = val;
        }
        
        skipSpace();
        if (input.charCodeAt(pos) === 0x3B) pos++; // ';'
        skipSpace();
      }
      pos++; // '}'
      return obj;
    } else if (c === 0x28) { // '('
      pos++;
      const arr: any[] = [];
      skipSpace();
      while (pos < len && input.charCodeAt(pos) !== 0x29) {
        const val = parseValue();
        if (val !== null) arr.push(val);
        skipSpace();
        if (input.charCodeAt(pos) === 0x2C) { pos++; skipSpace(); } // ','
      }
      pos++; // ')'
      return arr;
    } else if (c === 0x22 || c === 0x27) { // '"' or "'"
      return parseString(c);
    } else if (c === 0x3C) { // '<'
      pos++;
      const start = pos;
      const end = input.indexOf('>', pos);
      pos = end === -1 ? len : end + 1;
      return null; // ignore hex data
    } else {
      // unquoted string
      const start = pos;
      while (pos < len && isAlphaNum(input.charCodeAt(pos))) {
        pos++;
      }
      if (start === pos) {
          // Force advance to avoid infinite loop on syntax errors
          pos++;
          return null;
      }
      const str = input.substring(start, pos);
      if (!isNaN(str as any) && str.trim() !== '') return Number(str);
      return str;
    }
  }

  return parseValue();
}
