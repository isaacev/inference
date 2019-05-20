import { Span, Statement } from '~/syntax'
import Str from '~/types/str'
import Num from '~/types/num'
import Bool from '~/types/bool'
import Unknown from '~/types/unknown'
import Path from '~/paths'
import { DynamicOffset } from '~/paths/segments/offset'

export interface ContextTrace {
  location: Span
  parent: ContextTrace | null
}

export interface Constraint {
  readonly path: Path
  readonly atomicType: Unknown | Str | Num | Bool
  readonly trace: ContextTrace
  readonly origin: Span
}

export const toConstraints = (
  stmts: Statement[],
  base: Path,
  parent: ContextTrace | null = null
): Constraint[] => {
  const nestedConstraints = stmts.map<Constraint[]>(stmt => {
    if (stmt.statement === 'text') {
      return []
    }

    if (stmt.statement === 'inline') {
      return [
        {
          path: base.concat(stmt.path.value),
          atomicType: new Str(),
          trace: { location: stmt.path.location, parent },
          origin: stmt.path.location,
        },
      ]
    }

    if (stmt.statement === 'block' && stmt.name.value === 'with') {
      const trace = { location: stmt.path.location, parent }
      return [
        {
          path: base.concat(stmt.path.value),
          atomicType: new Unknown(),
          trace,
          origin: stmt.path.location,
        },
        ...toConstraints(stmt.statements, base.concat(stmt.path.value), trace),
      ]
    }

    if (stmt.statement === 'block' && stmt.name.value === 'loop') {
      const trace = { location: stmt.path.location, parent }
      return [
        {
          path: base.concat(stmt.path.value).concat(new DynamicOffset()),
          atomicType: new Unknown(),
          trace,
          origin: stmt.path.location,
        },
        ...toConstraints(
          stmt.statements,
          base.concat(stmt.path.value).concat(new DynamicOffset()),
          trace
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
