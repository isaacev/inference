import { Span } from '~/syntax'
import { Token, TokenName } from '~/syntax/lex'
import TemplateError from '~/errors'
import * as report from '~/errors/report'

export const unclosedActionError = (params: {
  where: Span
  template: string
}) =>
  new TemplateError({
    title: 'Unclosed action',
    trace: { location: params.where, parent: null },
    parts: [
      report.text('Action was left unclosed on line $0:', [
        params.where.start.line.toString(),
      ]),
      report.errorSnippet(params.template, params.where),
    ],
  })

export const unexpectedCharacterError = (params: {
  character: string
  where: Span
  template: string
}) =>
  new TemplateError({
    title: 'Unexpected character',
    trace: { location: params.where, parent: null },
    parts: [
      report.text('Unexpected character `$0` found on line $1:', [
        params.character,
        params.where.start.line.toString(),
      ]),
      report.errorSnippet(params.template, params.where),
    ],
  })

export const unexpectedTokenError = (params: {
  found: Token
  expected: TokenName[]
  template: string
}) =>
  new TemplateError({
    title: 'Unexpected token',
    trace: { location: params.found.location, parent: null },
    parts: [
      report.text('Unexpected token `$0` found on line $1:', [
        params.found.name,
        params.found.location.start.line.toString(),
      ]),
      report.errorSnippet(params.template, params.found.location),
      report.text(
        params.expected.length === 1
          ? 'Expected the following token:'
          : 'Expected one of the following tokens:'
      ),
      report.quote(params.expected),
    ],
  })

export const unclosedBlockError = (params: {
  blockName: string
  where: Span
  template: string
}) =>
  new TemplateError({
    title: 'Unclosed block',
    trace: { location: params.where, parent: null },
    parts: [
      // TODO
    ],
  })

export const mismatchedClosingTag = (params: {
  wantedName: string
  foundName: string
  where: Span
  template: string
}) =>
  new TemplateError({
    title: 'Mismatched closing tag',
    trace: { location: params.where, parent: null },
    parts: [
      // TODO
    ],
  })
