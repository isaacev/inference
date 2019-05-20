import TemplateError from '~/errors'
import * as report from '~/errors/report'
import Path from '~/paths'
import Offset from '~/paths/segments/offset'
import Field from '~/paths/segments/field'
import Type from '~/types'
import { ContextTrace } from './constraints'

export const typeMismatchError = (params: {
  path: Path
  original: { type: Type; where: ContextTrace }
  conflict: { type: Type; where: ContextTrace }
  template: string
}) =>
  new TemplateError({
    title: 'Type mismatch',
    trace: params.conflict.where,
    parts: [
      report.text('`$0` is used on line $1 like this:', [
        params.path.toString(),
        params.conflict.where.location.start.line.toString(),
      ]),
      report.trace(params.template, 'error', params.conflict.where),
      report.text('Which requires `$0` to have the type:', [
        params.path.toString(),
      ]),
      report.type(params.conflict.type),
      report.text('But on line $0, `$1` is used like this:', [
        params.original.where.location.start.line.toString(),
        params.path.toString(),
      ]),
      report.trace(params.template, 'help', params.original.where),
      report.text('Which requires `$0` to have the type:', [
        params.path.toString(),
      ]),
      report.type(params.original.type),
    ],
  })

export const unsupportedOffsetError = (params: {
  path: Path
  offset: Offset
  type: Type
  where: ContextTrace
  template: string
}) =>
  new TemplateError({
    title: 'Type mismatch',
    trace: params.where,
    parts: [
      report.text(
        'The value `$0` is not a List or Tuple, so has no indices to access:',
        [params.path.toString()]
      ),
      report.trace(params.template, 'error', params.where),
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
  where: ContextTrace
  original: ContextTrace
  template: string
}) =>
  new TemplateError({
    title: 'Type mismatch',
    trace: params.where,
    parts: [
      report.text(
        '`$0` was used as a `$1` on line $2 but as an `Object` was used on line $3',
        [
          params.path.toString(),
          params.type.toString(),
          params.original.location.start.line.toString(),
          params.where.location.start.line.toString(),
        ]
      ),
      report.text(
        'The value `$0` is not an Object, so has no fields to access on line $1:',
        [params.path.toString(), params.where.location.start.line.toString()]
      ),
      report.trace(params.template, 'error', params.where),
      report.text(
        '`$0` was assumed to have the type `$1` because of its use on line $2:',
        [
          params.path.toString(),
          params.type.toString(),
          params.original.location.start.line.toString(),
        ]
      ),
      report.trace(params.template, 'help', params.original),
    ],
  })
