export const sprintf = (fmt: string, vars: string[] = []): string => {
  let whole = ''
  for (let i = 0; i < fmt.length; i++) {
    const match = fmt.slice(i).match(/^\$(\d+)/)
    if (match !== null) {
      const ref = parseInt(match[1], 10)
      if (vars.length > ref) {
        whole += vars[ref]
      } else {
        whole += match[0]
      }
      i += match[0].length - 1
    } else {
      whole += fmt[i]
    }
  }
  return whole
}

export const tokenize = <T>(
  str: string,
  pat: RegExp,
  fn: (match: RegExpExecArray) => T
) => {
  const matches = findAllMatches(str, pat)
  const tokens = [] as (string | T)[]
  let index = 0
  for (const match of matches) {
    tokens.push(str.substring(index, match.index))
    tokens.push(fn(match))
    index = match.index + match[0].length
  }
  tokens.push(str.substring(index, str.length))
  return tokens
}

const findAllMatches = (str: string, pat: RegExp): RegExpExecArray[] => {
  const matches = [] as RegExpExecArray[]
  let match = null as RegExpExecArray | null
  do {
    match = pat.exec(str)
    if (match) {
      matches.push(match)
    }
  } while (match)
  return matches
}
