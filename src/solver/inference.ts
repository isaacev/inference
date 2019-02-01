import { Constraint } from '~/solver/constraints'

// Error tracking and rendering
import { Location } from '~/parser/grammar'
import * as errors from '~/solver/errors'

// Paths and segments
import Path from '~/paths'
import Segment from '~/paths/segments'
import Offset from '~/paths/segments/offset'
import Field from '~/paths/segments/field'

// Types
import Type from '~/types'
import Unknown from '~/types/unknown'
import Str from '~/types/str'
import Num from '~/types/num'
import Bool from '~/types/bool'
import Tuple from '~/types/tuple'
import List from '~/types/list'
import Dict from '~/types/dict'

type NodePair<S extends Segment = Segment> = { segment: S; node: Node }

type LeafType = Str | Num | Bool

type Node =
  | { mode: 'unknown'; path: Path; because: Location }
  | { mode: 'leaf'; path: Path; because: Location; type: LeafType }
  | { mode: 'offset'; path: Path; because: Location; pairs: NodePair<Offset>[] }
  | { mode: 'field'; path: Path; because: Location; pairs: NodePair<Field>[] }

export const solve = (template: string, constraints: Constraint[]): Type => {
  if (constraints.length === 0) {
    return new Unknown()
  }

  let root: Node = {
    mode: 'unknown',
    path: new Path(),
    because: constraints[0].origin,
  }

  let type: Type = new Unknown()

  for (const cons of constraints) {
    root = extendPath(template, new Path(), cons.path, cons, root)
    type = derriveType(template, root)
  }

  return type
}

const newPath = (
  tmpl: string,
  base: Path,
  rest: Path,
  cons: Constraint
): Node => {
  const head = rest.head()
  if (head === null) {
    return newLeafNode(tmpl, base, cons)
  } else {
    return newBranchNode(tmpl, base, head, rest.rest(), cons)
  }
}

const newLeafNode = (tmpl: string, base: Path, cons: Constraint): Node => {
  if (cons.atomicType instanceof Unknown) {
    return {
      mode: 'unknown',
      path: base,
      because: cons.origin,
    }
  } else {
    return {
      mode: 'leaf',
      path: base,
      because: cons.origin,
      type: cons.atomicType,
    }
  }
}

const newBranchNode = (
  tmpl: string,
  base: Path,
  head: Segment,
  rest: Path,
  cons: Constraint
): Node => {
  if (head instanceof Offset) {
    return {
      mode: 'offset',
      path: base,
      because: cons.origin,
      pairs: [
        { segment: head, node: newPath(tmpl, base.concat(head), rest, cons) },
      ],
    }
  } else if (head instanceof Field) {
    return {
      mode: 'field',
      path: base,
      because: cons.origin,
      pairs: [
        { segment: head, node: newPath(tmpl, base.concat(head), rest, cons) },
      ],
    }
  } else {
    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

const extendPath = (
  tmpl: string,
  base: Path,
  rest: Path,
  cons: Constraint,
  node: Node
): Node => {
  const head = rest.head()
  if (head === null) {
    return extendLeafNode(tmpl, base, cons, node)
  } else {
    return extendBranchNode(tmpl, base, head, rest.rest(), cons, node)
  }
}

const extendLeafNode = (
  tmpl: string,
  base: Path,
  cons: Constraint,
  node: Node
): Node => {
  if (cons.atomicType instanceof Unknown) {
    // If the node already exists but the constraint doesn't add any new
    // information, just return the existing node.
    return node
  }

  switch (node.mode) {
    case 'unknown':
      return {
        mode: 'leaf',
        path: base,
        because: cons.origin,
        type: cons.atomicType,
      }
    case 'leaf':
      try {
        return {
          mode: 'leaf',
          path: base,
          because: node.because,
          type: node.type.intersect(cons.atomicType) as LeafType,
        }
      } catch {
        throw errors.typeMismatchError({
          path: base,
          original: { type: derriveType(tmpl, node), where: node.because },
          conflict: { type: cons.atomicType, where: cons.origin },
          template: tmpl,
        })
      }
    default:
      throw errors.typeMismatchError({
        path: base,
        original: { type: derriveType(tmpl, node), where: node.because },
        conflict: { type: cons.atomicType, where: cons.origin },
        template: tmpl,
      })
  }
}

const extendBranchNode = (
  tmpl: string,
  base: Path,
  head: Segment,
  rest: Path,
  cons: Constraint,
  node: Node
): Node => {
  if (head instanceof Offset) {
    switch (node.mode) {
      case 'unknown':
        return {
          mode: 'offset',
          path: base,
          because: cons.origin,
          pairs: [
            {
              segment: head,
              node: newPath(tmpl, base.concat(head), rest, cons),
            },
          ],
        }
      case 'leaf':
        throw errors.unsupportedOffsetError({
          path: node.path,
          offset: head,
          type: node.type,
          where: cons.origin,
          template: tmpl,
        })
      case 'offset': {
        const matchingPair = node.pairs.find(pair => pair.segment.equalTo(head))
        if (matchingPair) {
          return {
            mode: 'offset',
            path: base,
            because: node.because,
            pairs: node.pairs.map(pair => {
              return pair === matchingPair
                ? {
                    ...pair,
                    node: extendPath(
                      tmpl,
                      base.concat(head),
                      rest,
                      cons,
                      pair.node
                    ),
                  }
                : pair
            }),
          }
        } else {
          return {
            mode: 'offset',
            path: base,
            because: node.because,
            pairs: node.pairs.concat({
              segment: head,
              node: newPath(tmpl, base.concat(head), rest, cons),
            }),
          }
        }
      }
      case 'field':
        throw errors.unsupportedOffsetError({
          path: node.path,
          offset: head,
          type: derriveType(tmpl, node),
          where: cons.origin,
          template: tmpl,
        })
      default:
        throw new Error(`unknown node type: '${(node as any).mode}'`)
    }
  } else if (head instanceof Field) {
    switch (node.mode) {
      case 'unknown':
        return {
          mode: 'field',
          path: base,
          because: cons.origin,
          pairs: [
            {
              segment: head,
              node: newPath(tmpl, base.concat(head), rest, cons),
            },
          ],
        }
      case 'leaf':
      case 'offset':
        throw errors.unsupportedFieldError({
          path: node.path,
          field: head,
          type: derriveType(tmpl, node),
          where: cons.origin,
          original: node.because,
          template: tmpl,
        })
      case 'field': {
        const matchingPair = node.pairs.find(pair => pair.segment.equalTo(head))
        if (matchingPair) {
          return {
            mode: 'field',
            path: base,
            because: node.because,
            pairs: node.pairs.map(pair => {
              return pair === matchingPair
                ? {
                    ...pair,
                    node: extendPath(
                      tmpl,
                      base.concat(head),
                      rest,
                      cons,
                      pair.node
                    ),
                  }
                : pair
            }),
          }
        } else {
          return {
            mode: 'field',
            path: base,
            because: node.because,
            pairs: node.pairs.concat({
              segment: head,
              node: newPath(tmpl, base.concat(head), rest, cons),
            }),
          }
        }
      }
      default:
        throw new Error(`unknown node type: '${(node as any).mode}'`)
    }
  } else {
    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

const derriveType = (tmpl: string, node: Node): Type => {
  switch (node.mode) {
    case 'unknown':
      return new Unknown()
    case 'leaf':
      return node.type
    case 'offset': {
      const allHaveStaticIndices = node.pairs.every(p => p.segment.hasIndex())
      const staticIndices = node.pairs
        .filter(p => p.segment.hasIndex())
        .map(p => p.segment.offset || 0)
      const minLength = Math.max(...staticIndices.map(i => i + 1), 0)

      if (allHaveStaticIndices) {
        const members = Array.from({ length: minLength }).map((_, i) => {
          const matchingChild = node.pairs.find(p => p.segment.offset === i)
          if (matchingChild) {
            return derriveType(tmpl, matchingChild.node)
          } else {
            return new Unknown()
          }
        })
        return new Tuple(members)
      } else {
        if (node.pairs.length === 0) {
          return new List(new Unknown(), minLength)
        }

        let prevPair = node.pairs[0]
        let prevType = derriveType(tmpl, prevPair.node)
        for (const nextPair of node.pairs.slice(1)) {
          const nextType = derriveType(tmpl, nextPair.node)
          try {
            prevType = prevType.intersect(nextType)
          } catch {
            throw errors.typeMismatchError({
              path: node.path,
              original: {
                type: new List(prevType),
                where: prevPair.node.because,
              },
              conflict: {
                type: new List(nextType),
                where: nextPair.node.because,
              },
              template: tmpl,
            })
          }

          if (nextType instanceof Unknown === false) {
            prevPair = nextPair
          }
        }

        return new List(prevType, minLength)
      }
    }
    case 'field': {
      const fields = node.pairs.map(p => ({
        name: p.segment.name,
        type: derriveType(tmpl, p.node),
      }))
      return new Dict(fields)
    }
  }
}
