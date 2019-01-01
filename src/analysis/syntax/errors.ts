import { Location } from '../grammar'
import { TypeError } from '../types/errors'
import * as grammar from '../grammar'

export class TemplateError {
  constructor(public message: string, public origin: Location) {}
}

export class TemplateErrorCollection {
  constructor(public errors: TemplateError[]) {}
}

interface HelpfulErrorParams {
  message: string
  origin: {
    where: Location
    description?: string
  }
  help: {
    where: Location
    description?: string
  }
}

export class HelpfulTemplateError extends TemplateError {
  constructor(public params: HelpfulErrorParams) {
    super(params.message, params.origin.where)
  }
}

export class TemplateSyntaxError extends TemplateError {}

export class UnknownBlockError extends TemplateSyntaxError {
  constructor(public blockStmt: grammar.Block) {
    super(`unknown '${blockStmt.open.text}' block`, blockStmt.pos)
  }
}

export class UnknownClauseError extends TemplateSyntaxError {
  constructor(clauseName: string, blockName: string, origin: Location) {
    super(`unknown '${clauseName}' clause in '${blockName}' block`, origin)
  }
}

export class TooManyClausesError extends TemplateSyntaxError {
  constructor(blockName: string, clauseName: string, origin: Location) {
    super(`'${blockName}' allows at most one '${clauseName}' clause`, origin)
  }
}

export class MismatchedClosingTagError extends TemplateSyntaxError {
  constructor(blockName: string, origin: Location) {
    super(`expected '${blockName}' in closing tag`, origin)
  }
}

export class TemplateTypeError extends TemplateError {
  constructor(error: TypeError, origin: Location) {
    super(error.message, origin)
  }
}
