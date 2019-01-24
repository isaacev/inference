import Type from '~/types'
import { Location } from '~/parser/grammar'

export interface Report {
  title: string
  verbose: ReportPart[]
}

export type ReportPart =
  | ReportEmpty
  | ReportText
  | ReportType
  | ReportQuote
  | ReportSnippet

interface ReportEmpty {
  form: 'empty'
}

export const empty = (): ReportEmpty => ({ form: 'empty' })

interface ReportText {
  form: 'text'
  text: string
}

export const text = (fmt: string, vars: string[] = []): ReportText => {
  return {
    form: 'text',
    text: sprintf(fmt, vars),
  }
}

interface ReportType {
  form: 'type'
  type: Type
}

export const type = (type: Type): ReportType => {
  return { form: 'type', type }
}

interface ReportQuote {
  form: 'quote'
  lines: string[]
}

export const quote = (lines: string[]): ReportQuote => {
  return { form: 'quote', lines }
}

interface ReportSnippet {
  form: 'snippet'
  template: string
  snippet:
    | { size: 'single'; line: number; columns: [number, number] }
    | { size: 'multi'; lines: [number, number] }
}

export const snippet = (template: string, where: Location): ReportSnippet => {
  if (where.start.line === where.end.line) {
    return {
      form: 'snippet',
      template,
      snippet: {
        size: 'single',
        line: where.start.line,
        columns: [where.start.column, where.end.column],
      },
    }
  } else {
    return {
      form: 'snippet',
      template,
      snippet: {
        size: 'multi',
        lines: [where.start.line, where.end.line],
      },
    }
  }
}

const sprintf = (fmt: string, vars: string[] = []): string => {
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
