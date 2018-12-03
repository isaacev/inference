import * as grammar from './grammar'
import { error } from './error'

export type Statement = Text | Inline | Block

export interface Text {
  type: 'text'
  text: string
  where: grammar.Location
}

export interface Inline {
  type: 'inline'
  field: Field
  where: grammar.Location
}

export interface Block {
  type: 'block'
  name: string
  field: Field
  stmts: Statement[]
  where: grammar.Location
}

export type Field = string[]

export interface WithBlock extends Block {
  name: 'with'
}

export interface LoopBlock extends Block {
  name: 'loop'
  emptyClause: Statement[]
}

export interface MatchBlock extends Block {
  name: 'match'
  orClauses: Statement[][]
}

export class BlockRule {
  constructor(
    public name: string,
    public clauses: ClauseRule[],
    public normalize: (block: grammar.Block) => Block
  ) {}

  public appliesTo(block: grammar.Block) {
    return block.open.text === this.name
  }
}

export class ClauseRule {
  constructor(public name: string, public limit: 'one' | 'many') {}

  public appliesTo(clause: grammar.Clause) {
    return clause.name.text === this.name
  }
}

const normField = (segments: string[]): Field => segments

const normWith = (block: grammar.Block): WithBlock => {
  return {
    type: 'block',
    name: 'with',
    field: normField(block.field),
    stmts: normStmts(block.stmts),
    where: block.pos,
  }
}

const normLoop = (block: grammar.Block): LoopBlock => {
  return {
    type: 'block',
    name: 'loop',
    field: normField(block.field),
    stmts: normStmts(block.stmts),
    emptyClause:
      block.clauses.length > 0 ? normStmts(block.clauses[0].stmts) : [],
    where: block.pos,
  }
}

const normMatch = (block: grammar.Block): MatchBlock => {
  return {
    type: 'block',
    name: 'match',
    field: normField(block.field),
    stmts: normStmts(block.stmts),
    orClauses: block.clauses.map(c => normStmts(c.stmts)),
    where: block.pos,
  }
}

const BLOCK_RULES = [
  new BlockRule('with', [], normWith),
  new BlockRule('loop', [new ClauseRule('empty', 'one')], normLoop),
  new BlockRule('match', [new ClauseRule('or', 'many')], normMatch),
]

/**
 * By design, the grammar only makes sure that the template conforms to the most
 * basic syntax rules. The grammar does nothing to check if a block name is
 * legal or if the block has the correct clauses. Checks of that kind are
 * performed by this function. The distinction allows for the creation of more
 * specific error messages and even the ability to fix some errors.
 */
export const parse = (
  tmpl: string
): [error.TemplateSyntaxError[], Statement[]] => {
  try {
    const basicTree = toBasicTree(tmpl)
    const errs = findErrors(basicTree)
    const stmts = normStmts(basicTree)
    return [errs, stmts]
  } catch (err) {
    if (err instanceof error.TemplateSyntaxError) {
      return [[err], []]
    } else {
      throw err
    }
  }
}

const toBasicTree = (tmpl: string): grammar.Statement[] => {
  try {
    return grammar.parse(tmpl)
  } catch (err) {
    if (err instanceof grammar.SyntaxError) {
      throw new error.TemplateSyntaxError(err.location, err.message)
    } else {
      throw err
    }
  }
}

const isBlockStmt = (stmt: grammar.Statement): stmt is grammar.Block => {
  return stmt.type === 'block'
}

const findErrors = (stmts: grammar.Statement[]) => {
  const errs = [] as error.TemplateSyntaxError[]

  // Check each block node to make sure it:
  // 1. corresponds to a known block form
  // 2. has no internal errors
  stmts.filter(isBlockStmt).forEach(blockStmt => {
    const blockRule = BLOCK_RULES.find(f => f.appliesTo(blockStmt))
    if (!blockRule) {
      errs.push(new error.UnknownBlockError(blockStmt))

      // Even though no corresponding block form was found, child blocks
      // and clauses can still be checked for internal errors
      errs.push(...findErrors(blockStmt.stmts))
      blockStmt.clauses.forEach(clause => {
        errs.push(...findErrors(clause.stmts))
      })
    } else {
      // Check any non-clause substatements
      errs.push(...findErrors(blockStmt.stmts))

      // Check any clauses
      blockStmt.clauses.forEach((clause, index) => {
        const clauseRule = blockRule.clauses.find(c => c.appliesTo(clause))
        if (!clauseRule) {
          errs.push(new error.UnknownClauseError(clause, blockRule))
        } else {
          const similarClausesBefore = blockStmt.clauses
            .slice(0, index)
            .filter(n => clauseRule.appliesTo(n))

          // Form allows a max of 1 clause of this type but found more than 1
          if (clauseRule.limit === 'one' && similarClausesBefore.length > 0) {
            errs.push(
              new error.TooManyClausesError(clause, clauseRule, blockRule)
            )
          }
        }

        // Check clause statements for internal errors
        errs.push(...findErrors(clause.stmts))
      })

      // Check block closing tag
      if (blockStmt.close.text !== blockRule.name) {
        errs.push(new error.MismatchedClosingTagError(blockStmt, blockRule))
      }
    }
  })

  return errs
}

const normStmts = (stmts: grammar.Statement[]) => {
  return stmts.map(s => normStmt(s))
}

const normStmt = (stmt: grammar.Statement) => {
  switch (stmt.type) {
    case 'text':
      return { type: 'text', text: stmt.text, where: stmt.pos } as Text
    case 'inline':
      return {
        type: 'inline',
        field: normField(stmt.field),
        where: stmt.pos,
      } as Inline
    case 'block':
      return normBlock(stmt)
  }
}

const normBlock = (block: grammar.Block): Block => {
  const rule = BLOCK_RULES.find(r => r.appliesTo(block))
  if (rule) {
    return rule.normalize(block)
  } else {
    return {
      type: 'block',
      name: 'unknown',
      field: normField(block.field),
      stmts: normStmts(block.stmts),
      where: block.pos,
    }
  }
}
