import Type from '~/types'
import { Span } from '~/syntax'
import { sprintf } from '~/errors/utils'
import { ContextTrace } from '~/solver/constraints'

export interface Report {
  title: string
  trace: ContextTrace
  parts: ReportPart[]
}

export type ReportPart =
  | ReportEmpty
  | ReportText
  | ReportType
  | ReportQuote
  | ReportSnippet
  | ReportTrace

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

export interface SingleLineSnippet {
  size: 'single'
  line: number
  columns: [number, number]
}

export interface MultiLineSnippet {
  size: 'multi'
  lines: [number, number]
}

interface ReportSnippet {
  form: 'snippet'
  mode: 'error' | 'help'
  template: string
  snippet: SingleLineSnippet | MultiLineSnippet
}

export const errorSnippet = (template: string, where: Span): ReportSnippet => ({
  form: 'snippet',
  mode: 'error',
  template,
  snippet: spanToSnippet(where),
})

export const helpSnippet = (template: string, where: Span): ReportSnippet => ({
  form: 'snippet',
  mode: 'help',
  template,
  snippet: spanToSnippet(where),
})

const spanToSnippet = (where: Span): SingleLineSnippet | MultiLineSnippet => {
  if (where.start.line === where.end.line) {
    return {
      size: 'single',
      line: where.start.line,
      columns: [where.start.column, where.end.column],
    }
  } else {
    return {
      size: 'multi',
      lines: [where.start.line, where.end.line],
    }
  }
}

interface ReportTrace {
  form: 'trace'
  mode: string
  template: string
  steps: (SingleLineSnippet | MultiLineSnippet)[]
}

export const trace = (
  template: string,
  mode: string,
  trace: ContextTrace
): ReportTrace => {
  const steps: ReportTrace['steps'] = []
  let nextStep: ContextTrace | null = trace
  while (nextStep !== null) {
    steps.unshift(spanToSnippet(nextStep.location))
    nextStep = nextStep.parent
  }

  return {
    form: 'trace',
    mode,
    template,
    steps,
  }
}
