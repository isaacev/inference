import * as grammar from './grammar'
import * as parse from './parse'

export namespace error {
  export abstract class TemplateError {
    public message: string

    constructor(public loc: grammar.Location, msg: string) {
      this.message = `(${loc.start.line}:${loc.start.column}) ${msg}`
    }

    public toString(): string {
      return this.message
    }
  }

  export class TemplateSyntaxError extends TemplateError {}

  export class UnknownBlockError extends TemplateSyntaxError {
    constructor(public blockStmt: grammar.Block) {
      super(blockStmt.pos, `unknown '${blockStmt.open.text}' block`)
    }
  }

  export class UnknownClauseError extends TemplateSyntaxError {
    constructor(
      public clauseNode: grammar.Clause,
      public blockRule: parse.BlockRule
    ) {
      super(
        clauseNode.pos,
        `unknown '${clauseNode.name.text}' clause in '${blockRule.name}' block`
      )
    }
  }

  export class TooManyClausesError extends TemplateSyntaxError {
    constructor(
      public clauseNode: grammar.Clause,
      public clauseRule: parse.ClauseRule,
      public blockRule: parse.BlockRule
    ) {
      super(
        clauseNode.pos,
        `'${blockRule.name}' block allows at most one '${
          clauseRule.name
        }' clause`
      )
    }
  }

  export class MismatchedClosingTagError extends TemplateSyntaxError {
    constructor(
      public blockStmt: grammar.Block,
      public blockRule: parse.BlockRule
    ) {
      super(blockStmt.close.pos, `expected '${blockRule.name}' in closing tag`)
    }
  }

  export class TemplateTypeError extends TemplateError {
    constructor(msg: string) {
      super(
        {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
        msg
      )
    }
  }
}
