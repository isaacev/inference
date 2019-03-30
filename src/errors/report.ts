import Type from '~/types'
import { Span } from '~/syntax'
import { sprintf } from '~/errors/utils'

export interface Report {
  title: string
  where: Span
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
  mode: 'error' | 'help'
  template: string
  snippet:
    | { size: 'single'; line: number; columns: [number, number] }
    | { size: 'multi'; lines: [number, number] }
}

export const errorSnippet = (template: string, where: Span) =>
  snippet('error', template, where)

export const helpSnippet = (template: string, where: Span) =>
  snippet('help', template, where)

const snippet = (
  mode: ReportSnippet['mode'],
  template: string,
  where: Span
): ReportSnippet => {
  if (where.start.line === where.end.line) {
    return {
      form: 'snippet',
      mode,
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
      mode,
      template,
      snippet: {
        size: 'multi',
        lines: [where.start.line, where.end.line],
      },
    }
  }
}
