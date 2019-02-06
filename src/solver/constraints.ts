import { Span, Statement } from '~/syntax'
import Str from '~/types/str'
import Num from '~/types/num'
import Bool from '~/types/bool'
import Unknown from '~/types/unknown'
import Path from '~/paths'
import Offset from '~/paths/segments/offset'

export interface Constraint {
  readonly path: Path
  readonly atomicType: Unknown | Str | Num | Bool
  readonly origin: Span
}

export const toConstraints = (stmts: Statement[], base: Path): Constraint[] => {
  const nestedConstraints = stmts.map<Constraint[]>(stmt => {
    if (stmt.type === 'text') {
      return []
    }

    if (stmt.type === 'inline') {
      return [
        {
          path: base.concat(stmt.field),
          atomicType: new Str(),
          origin: stmt.where,
        },
      ]
    }

    if (stmt.type === 'block' && stmt.name === 'with') {
      return [
        {
          path: base.concat(stmt.field),
          atomicType: new Unknown(),
          origin: stmt.where,
        },
        ...toConstraints(stmt.stmts, base.concat(stmt.field)),
      ]
    }

    if (stmt.type === 'block' && stmt.name === 'loop') {
      return [
        {
          path: base.concat(stmt.field).concat(new Offset()),
          atomicType: new Unknown(),
          origin: stmt.where,
        },
        ...toConstraints(
          stmt.stmts,
          base.concat(stmt.field).concat(new Offset())
        ),
      ]
    }

    throw new Error(`unknown statement of type '${stmt.type}'`)
  })

  const flattenConstraints = nestedConstraints.reduce((flat, nested) => {
    return flat.concat(nested)
  }, [])

  return flattenConstraints
}
