import * as grammar from '~/parser/grammar'
import * as tree from '~/parser/tree'
import * as errors from '~/parser/errors'
import TemplateError from '~/errors'
import Path from '~/paths'

class BlockRule {
  constructor(
    public name: string,
    public clauses: ClauseRule[],
    public norm: (block: grammar.Block) => tree.Block
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
      return { type: 'text', text: stmt.text, where: stmt.pos } as tree.Text
    case 'inline':
      return {
        type: 'inline',
        field: Path.fromFields(stmt.field),
        where: stmt.pos,
      } as tree.Inline
    case 'block':
      return normBlock(stmt)
  }
}

const normBlock = (block: grammar.Block): tree.Block => {
  const rule = BLOCK_RULES.find(r => r.appliesTo(block))
  if (rule) {
    return rule.norm(block)
  } else {
    return {
      type: 'block',
      name: 'unknown',
      field: Path.fromFields(block.field),
      stmts: normStmts(block.stmts),
      where: block.pos,
    }
  }
}

const normWith = (block: grammar.Block): tree.WithBlock => {
  return {
    type: 'block',
    name: 'with',
    field: Path.fromFields(block.field),
    stmts: normStmts(block.stmts),
    where: block.pos,
  }
}

const normLoop = (block: grammar.Block): tree.LoopBlock => {
  return {
    type: 'block',
    name: 'loop',
    field: Path.fromFields(block.field),
    stmts: normStmts(block.stmts),
    emptyClause:
      block.clauses.length > 0 ? normStmts(block.clauses[0].stmts) : [],
    where: block.pos,
  }
}

const normMatch = (block: grammar.Block): tree.MatchBlock => {
  return {
    type: 'block',
    name: 'match',
    field: Path.fromFields(block.field),
    stmts: normStmts(block.stmts),
    orClauses: block.clauses.map(c => normStmts(c.stmts)),
    where: block.pos,
  }
}

const findErrors = (template: string, stmts: grammar.Statement[]) => {
  const errs = [] as TemplateError[]

  // Check each block node to make sure it:
  // 1. corresponds to a known block form
  // 2. has no internal errors
  stmts.filter(isBlockStmt).forEach(blockStmt => {
    const blockRule = BLOCK_RULES.find(f => f.appliesTo(blockStmt))
    if (!blockRule) {
      errs.push(
        errors.unknownBlock({
          block: blockStmt.open.text,
          template,
          where: blockStmt.open.pos,
        })
      )

      // Even though no corresponding block form was found, child blocks
      // and clauses can still be checked for internal errors
      errs.push(...findErrors(template, blockStmt.stmts))
      blockStmt.clauses.forEach(clause => {
        errs.push(...findErrors(template, clause.stmts))
      })
    } else {
      // Check any non-clause substatements
      errs.push(...findErrors(template, blockStmt.stmts))

      // Check any clauses
      blockStmt.clauses.forEach((clause, index) => {
        const clauseRule = blockRule.clauses.find(c => c.appliesTo(clause))
        if (!clauseRule) {
          const clauseName = clause.name.text
          const blockName = blockRule.name
          const origin = clause.pos
          errs.push(
            errors.unknownClause({
              block: blockName,
              clause: clauseName,
              template,
              where: origin,
              supported: blockRule.clauses.map(c => c.name),
            })
          )
        } else {
          const similarClausesBefore = blockStmt.clauses
            .slice(0, index)
            .filter(n => clauseRule.appliesTo(n))

          // Form allows a max of 1 clause of this type but found more than 1
          if (clauseRule.limit === 'one' && similarClausesBefore.length > 0) {
            const blockName = blockRule.name
            const clauseName = clauseRule.name
            const origin = clause.pos
            errs.push(
              errors.tooManyClauses({
                block: blockName,
                clause: clauseName,
                template,
                where: origin,
              })
            )
          }
        }

        // Check clause statements for internal errors
        errs.push(...findErrors(template, clause.stmts))
      })

      // Check block closing tag
      if (blockStmt.close.text !== blockRule.name) {
        const blockName = blockRule.name
        const origin = blockStmt.close.pos
        errs.push(
          errors.mismatchedClosingTag({
            block: blockName,
            openingLine: blockStmt.open.pos.start.line,
            found: blockStmt.close.text,
            template,
            where: origin,
          })
        )
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
      throw errors.parseError({
        message: err.message,
        template: tmpl,
        where: err.location,
      })
    } else {
      throw err
    }
  }
}

export const parse = (tmpl: string): tree.Statement[] => {
  const raw = toRawTree(tmpl)
  const errs = findErrors(tmpl, raw)

  if (errs.length > 0) {
    throw errs
  } else {
    return normStmts(raw)
  }
}
