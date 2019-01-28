import Type from '~/types'
import { Location } from '~/parser/grammar'
import { sprintf } from '~/errors/utils'

export interface Report {
  title: string
  parts: ReportPart[]
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
