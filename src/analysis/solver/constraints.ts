import { Path, Index } from '../types/paths'
import { Type, Unknown, Str, List } from '../types/types'
import { Statement, Location } from '../syntax/tree'

export interface Constraint {
  path: Path
  type: Type
  origin: Location
}

type ConstraintShorthand = (path: Path, origin: Location) => Constraint

const isUnknown: ConstraintShorthand = (path, origin) => ({
  path,
  type: new Unknown(),
  origin,
})

const isString: ConstraintShorthand = (path, origin) => ({
  path,
  type: new Str(),
  origin,
})

const isList: ConstraintShorthand = (path, origin) => ({
  path,
  type: new List(),
  origin,
})

export const stmtsToConstraints = (
  stmts: Statement[],
  prefix = new Path()
): Constraint[] => {
  return stmts
    .map(stmt => {
      if (stmt.type === 'inline') {
        return [isString(prefix.concat(stmt.field), stmt.where)]
      } else if (stmt.type === 'block') {
        const newPrefix = prefix.concat(stmt.field)

        /**
         * For each block, generate the correct set of constraints for that
         * block and recursively generate constraints for any of its child
         * statements.
         */
        if (stmt.name === 'with') {
          return [
            isUnknown(newPrefix, stmt.where),
            ...stmtsToConstraints(stmt.stmts, newPrefix),
          ]
        } else if (stmt.name === 'loop') {
          return [
            isList(newPrefix, stmt.where),
            ...stmtsToConstraints(stmt.stmts, newPrefix.concat(new Index())),
          ]
        } else if (stmt.name === 'match') {
          console.error(`match block not supported yet`)
          return []
        } else {
          console.error(`skipping "${stmt.name}" block`)
          return []
        }
      }

      // Statements like the 'text' statement apply no constraints
      return []
    })
    .reduce((flat, nested) => flat.concat(nested), [])
}
