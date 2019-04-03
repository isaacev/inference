import { Span } from '~/syntax'
import TemplateError from '~/errors'
import * as report from '~/errors/report'

export const lexicalError = (params: {
  message: string
  where: Span
  template: string
}) => (
  console.log(JSON.stringify(params.where)),
  new TemplateError({
    title: 'Lexical error',
    where: params.where,
    parts: [
      report.text(
        'Unable to parse template because of an unexpected symbol on line $0:',
        [params.where.start.line.toString()]
      ),
      report.errorSnippet(params.template, params.where),
    ],
  })
)

export const unclosedBlockError = (params: {
  blockName: string
  where: Span
  template: string
}) =>
  new TemplateError({
    title: 'Unclosed block',
    where: params.where,
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
    where: params.where,
    parts: [
      // TODO
    ],
  })
