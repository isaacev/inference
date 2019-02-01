import { Location } from '~/parser/grammar'
import TemplateError from '~/errors'
import * as report from '~/errors/report'

export const parseError = (params: {
  message: string
  template: string
  where: Location
}) =>
  new TemplateError({
    title: 'Parsing error',
    parts: [
      report.text('Unable to parse template on line $0', [
        params.where.start.line.toString(),
      ]),
      report.errorSnippet(params.template, params.where),
      report.text(params.message),
    ],
  })

export const unknownBlock = (params: {
  block: string
  template: string
  where: Location
}) =>
  new TemplateError({
    title: 'Block error',
    parts: [
      report.text('Unknown block named `$0`', [params.block]),
      report.errorSnippet(params.template, params.where),
    ],
  })

export const unknownClause = (params: {
  block: string
  clause: string
  template: string
  where: Location
  supported: string[]
}) =>
  new TemplateError({
    title: 'Block error',
    parts: [
      report.text('Unknown clause named `$0`', [params.clause]),
      report.errorSnippet(params.template, params.where),
      report.text(
        'A `$0` block cannot have a `$1` clause. Did you mean one of the following?',
        [params.block, params.clause]
      ),
      report.quote(params.supported),
    ],
  })

export const tooManyClauses = (params: {
  block: string
  clause: string
  template: string
  where: Location
}) =>
  new TemplateError({
    title: 'Block error',
    parts: [
      report.text('Too many `$0` clauses', [params.clause]),
      report.errorSnippet(params.template, params.where),
      report.text(
        'A `$0` block can have at most 1 `$1` clause. At least 2 `$1` clauses were found.',
        [params.block, params.clause]
      ),
    ],
  })

export const mismatchedClosingTag = (params: {
  block: string
  openingLine: number
  found: string
  template: string
  where: Location
}) =>
  new TemplateError({
    title: 'Block error',
    parts: [
      report.text('Expected `$0` closing tag', [params.block]),
      report.errorSnippet(params.template, params.where),
      report.text(
        'The `$0` block was opened on line $1 correctly but the closing tag on line $2 used `$3` instead of `$4`.',
        [
          params.block,
          params.openingLine.toString(),
          params.where.start.line.toString(),
          params.found,
          params.block,
        ]
      ),
    ],
  })
