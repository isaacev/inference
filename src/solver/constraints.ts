import { Span, Statement } from '~/syntax'
import Str from '~/types/str'
import Num from '~/types/num'
import Bool from '~/types/bool'
import Unknown from '~/types/unknown'
import Path from '~/paths'
import { DynamicOffset } from '~/paths/segments/offset'

export interface Constraint {
  readonly path: Path
  readonly atomicType: Unknown | Str | Num | Bool
  readonly origin: Span
}

export const toConstraints = (stmts: Statement[], base: Path): Constraint[] => {
  const nestedConstraints = stmts.map<Constraint[]>(stmt => {
    if (stmt.statement === 'text') {
      return []
    }

    if (stmt.statement === 'inline') {
      return [
        {
          path: base.concat(stmt.path.value),
          atomicType: new Str(),
          origin: stmt.path.location,
        },
      ]
    }

    if (stmt.statement === 'block' && stmt.name.value === 'with') {
      return [
        {
          path: base.concat(stmt.path.value),
          atomicType: new Unknown(),
          origin: stmt.path.location,
        },
        ...toConstraints(stmt.statements, base.concat(stmt.path.value)),
      ]
    }

    if (stmt.statement === 'block' && stmt.name.value === 'loop') {
      return [
        {
          path: base.concat(stmt.path.value).concat(new DynamicOffset()),
          atomicType: new Unknown(),
          origin: stmt.path.location,
        },
        ...toConstraints(
          stmt.statements,
          base.concat(stmt.path.value).concat(new DynamicOffset())
        ),
      ]
    }

    throw new Error(`unknown statement of type '${stmt.statement}'`)
  })

  const flattenConstraints = nestedConstraints.reduce((flat, nested) => {
    return flat.concat(nested)
  }, [])

  return flattenConstraints
}
