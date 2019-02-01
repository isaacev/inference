import { Location } from '~/parser/grammar'
import TemplateError from '~/errors'
import * as report from '~/errors/report'
import Path from '~/paths'
import Offset from '~/paths/segments/offset'
import Field from '~/paths/segments/field'
import Type from '~/types'

export const typeMismatchError = (params: {
  path: Path
  original: { type: Type; where: Location }
  conflict: { type: Type; where: Location }
  template: string
}) =>
  new TemplateError({
    title: 'Type mismatch',
    parts: [
      report.text('`$0` is used on line $1 like this:', [
        params.path.toString(),
        params.conflict.where.start.line.toString(),
      ]),
      report.errorSnippet(params.template, params.conflict.where),
      report.text('Which requires `$0` to be:', [params.path.toString()]),
      report.type(params.conflict.type),
      report.text('But on line $0, `$1` is used like this:', [
        params.original.where.start.line.toString(),
        params.path.toString(),
      ]),
      report.helpSnippet(params.template, params.original.where),
      report.text('Which requires `$0` the type:', [params.path.toString()]),
      report.type(params.original.type),
    ],
  })

export const unsupportedOffsetError = (params: {
  path: Path
  offset: Offset
  type: Type
  where: Location
  template: string
}) =>
  new TemplateError({
    title: 'Type mismatch',
    parts: [
      report.text(
        'The value `$0` is not a List or Tuple, so has no indices to access:',
        [params.path.toString()]
      ),
      report.errorSnippet(params.template, params.where),
      report.text('The value `$0` already had the type:', [
        params.path.toString(),
      ]),
      report.type(params.type),
    ],
  })

export const unsupportedFieldError = (params: {
  path: Path
  field: Field
  type: Type
  where: Location
  original: Location
  template: string
}) =>
  new TemplateError({
    title: 'Type mismatch',
    parts: [
      report.text(
        'The value `$0` is not a Dictionary, so has no fields to access on line $1:',
        [params.path.toString(), params.where.start.line.toString()]
      ),
      report.errorSnippet(params.template, params.where),
      report.text(
        '`$0` was assumed to have the type `$1` because of its use on line $2:',
        [
          params.path.toString(),
          params.type.toString(),
          params.original.start.line.toString(),
        ]
      ),
      report.helpSnippet(params.template, params.original),
    ],
  })
