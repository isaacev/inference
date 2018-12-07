import * as grammar from '../grammar'
import {
  Statement,
  Text,
  Inline,
  Block,
  WithBlock,
  LoopBlock,
  MatchBlock,
} from './tree'
import {
  TemplateErrorCollection,
  TemplateSyntaxError,
  UnknownBlockError,
  UnknownClauseError,
  TooManyClausesError,
  MismatchedClosingTagError,
} from './errors'

class BlockRule {
  constructor(
    public name: string,
    public clauses: ClauseRule[],
    public norm: (block: grammar.Block) => Block
  ) {}

  appliesTo(block: grammar.Block) {
    return block.open.text === this.name
  }
}

class ClauseRule {
  constructor(public name: string, public limit: 'one' | 'many') {}

  appliesTo(clause: grammar.Clause) {
    return clause.name.text === this.name
  }
}

const normStmts = (stmts: grammar.Statement[]) => {
  return stmts.map(stmt => normStmt(stmt))
}

const normStmt = (stmt: grammar.Statement) => {
  switch (stmt.type) {
    case 'text':
      return { type: 'text', text: stmt.text, where: stmt.pos } as Text
    case 'inline':
      return {
        type: 'inline',
        field: stmt.field,
        where: stmt.pos,
      } as Inline
    case 'block':
      return normBlock(stmt)
  }
}

const normBlock = (block: grammar.Block): Block => {
  const rule = BLOCK_RULES.find(r => r.appliesTo(block))
  if (rule) {
    return rule.norm(block)
  } else {
    return {
      type: 'block',
      name: 'unknown',
      field: block.field,
      stmts: normStmts(block.stmts),
      where: block.pos,
    }
  }
}

const normWith = (block: grammar.Block): WithBlock => {
  return {
    type: 'block',
    name: 'with',
    field: block.field,
    stmts: normStmts(block.stmts),
    where: block.pos,
  }
}

const normLoop = (block: grammar.Block): LoopBlock => {
  return {
    type: 'block',
    name: 'loop',
    field: block.field,
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
    field: block.field,
    stmts: normStmts(block.stmts),
    orClauses: block.clauses.map(c => normStmts(c.stmts)),
    where: block.pos,
  }
}

const findErrors = (stmts: grammar.Statement[]) => {
  const errs = [] as TemplateSyntaxError[]

  // Check each block node to make sure it:
  // 1. corresponds to a known block form
  // 2. has no internal errors
  stmts.filter(isBlockStmt).forEach(blockStmt => {
    const blockRule = BLOCK_RULES.find(f => f.appliesTo(blockStmt))
    if (!blockRule) {
      errs.push(new UnknownBlockError(blockStmt))

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
          const clauseName = clause.name.text
          const blockName = blockRule.name
          const origin = clause.pos
          errs.push(new UnknownClauseError(clauseName, blockName, origin))
        } else {
          const similarClausesBefore = blockStmt.clauses
            .slice(0, index)
            .filter(n => clauseRule.appliesTo(n))

          // Form allows a max of 1 clause of this type but found more than 1
          if (clauseRule.limit === 'one' && similarClausesBefore.length > 0) {
            const blockName = blockRule.name
            const clauseName = clauseRule.name
            const origin = clause.pos
            errs.push(new TooManyClausesError(blockName, clauseName, origin))
          }
        }

        // Check clause statements for internal errors
        errs.push(...findErrors(clause.stmts))
      })

      // Check block closing tag
      if (blockStmt.close.text !== blockRule.name) {
        const blockName = blockRule.name
        const origin = blockStmt.close.pos
        errs.push(new MismatchedClosingTagError(blockName, origin))
      }
    }
  })

  return errs
}

const isBlockStmt = (stmt: grammar.Statement): stmt is grammar.Block => {
  return stmt.type === 'block'
}

const BLOCK_RULES = [
  new BlockRule('with', [], normWith),
  new BlockRule('loop', [new ClauseRule('empty', 'one')], normLoop),
  new BlockRule('match', [new ClauseRule('or', 'many')], normMatch),
]

const toRawTree = (tmpl: string): grammar.Statement[] => {
  try {
    return grammar.parse(tmpl)
  } catch (err) {
    if (err instanceof grammar.SyntaxError) {
      throw new TemplateSyntaxError(err.message, err.location)
    } else {
      throw err
    }
  }
}

export const parse = (tmpl: string): Statement[] => {
  const raw = toRawTree(tmpl)
  const errs = findErrors(raw)

  if (errs.length > 0) {
    throw new TemplateErrorCollection(errs)
  } else {
    return normStmts(raw)
  }
}
