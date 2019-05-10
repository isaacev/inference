import { Constraint } from '~/solver/constraints'

// Error tracking and rendering
import { Span } from '~/syntax'
import * as errors from '~/solver/errors'

// Paths and segments
import Path from '~/paths'
import Segment from '~/paths/segments'
import Offset, { StaticOffset, DynamicOffset } from '~/paths/segments/offset'
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

export class Lessons {
  private table: { [path: string]: typeof Type } = {}

  public addLesson(path: Path, shouldBe: typeof Type) {
    this.table[path.toString()] = shouldBe
  }

  public hasLesson(path: Path) {
    return this.table.hasOwnProperty(path.toString())
  }

  public getLesson(path: Path): typeof Type | undefined {
    return this.table[path.toString()]
  }
}

export class AssumptionError {
  constructor(public path: Path, public shouldBe: typeof Type) {}
}

export interface Globals {
  template: string
  lessons: Lessons
}

export abstract class Node {
  public abstract readonly kind: string

  constructor(
    public path: Path,
    public because: Span,
    public constraints: Constraint[]
  ) {}

  abstract derrive(): Type

  abstract extend(
    g: Globals,
    head: Segment | null,
    rest: Path,
    cons: Constraint
  ): Node

  static create(g: Globals, path: Path, rest: Path, cons: Constraint): Node {
    const head = rest.head()

    if (head === null) {
      if (cons.atomicType instanceof Unknown) {
        return new UnknownNode(path, cons.origin, [cons])
      } else {
        return new LeafNode(path, cons.origin, [cons], cons.atomicType)
      }
    }

    const nextNode = Node.create(g, path.concat(head), rest.rest(), cons)

    if (head instanceof Offset) {
      const lesson = g.lessons.getLesson(path)
      if (head instanceof DynamicOffset || lesson === List) {
        return new ListNode(path, cons.origin, [cons], nextNode)
      } else if (head instanceof StaticOffset) {
        return new TupleNode(path, cons.origin, [cons], {
          [head.offset]: nextNode,
        })
      }
    }

    if (head instanceof Field) {
      return new FieldNode(
        path,
        cons.origin,
        [cons],
        [{ segment: head, node: nextNode }]
      )
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

export class UnknownNode extends Node {
  public readonly kind = 'unknown'

  derrive() {
    return new Unknown()
  }

  extend(g: Globals, head: Segment | null, rest: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    if (head === null) {
      return new LeafNode(
        this.path,
        cons.origin,
        this.constraints.concat(cons),
        cons.atomicType
      )
    }

    const nextNode = Node.create(g, this.path.concat(head), rest.rest(), cons)

    if (head instanceof Offset) {
      const lesson = g.lessons.getLesson(this.path)
      if (head instanceof DynamicOffset || lesson === List) {
        return new ListNode(
          this.path,
          cons.origin,
          this.constraints.concat(cons),
          nextNode
        )
      } else if (head instanceof StaticOffset) {
        return new TupleNode(
          this.path,
          cons.origin,
          this.constraints.concat(cons),
          {
            [head.offset]: nextNode,
          }
        )
      }
    }

    if (head instanceof Field) {
      return new FieldNode(
        this.path,
        cons.origin,
        this.constraints.concat(cons),
        [{ segment: head, node: nextNode }]
      )
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

class LeafNode extends Node {
  public readonly kind = 'leaf'

  constructor(
    path: Path,
    because: Span,
    constraints: Constraint[],
    public type: Str | Num | Bool
  ) {
    super(path, because, constraints)
  }

  derrive(): Type {
    return this.type
  }

  extend(
    g: Globals,
    head: Segment | null,
    _rest: Path,
    cons: Constraint
  ): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    if (head === null) {
      try {
        const newType = this.type.intersect(cons.atomicType) as LeafNode['type']
        return new LeafNode(
          this.path,
          this.because,
          this.constraints.concat(cons),
          newType
        )
      } catch {
        throw errors.typeMismatchError({
          path: this.path,
          original: { type: this.type, where: this.because },
          conflict: { type: cons.atomicType, where: cons.origin },
          template: g.template,
        })
      }
    }

    if (head instanceof Offset) {
      throw errors.unsupportedOffsetError({
        path: this.path,
        offset: head,
        type: this.type,
        where: cons.origin,
        template: g.template,
      })
    }

    if (head instanceof Field) {
      throw errors.unsupportedFieldError({
        path: this.path,
        field: head,
        type: this.type,
        where: cons.origin,
        original: this.because,
        template: g.template,
      })
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

// class OffsetNode extends Node {
//   public readonly kind = 'offset'
//   public readonly pairs: { segment: Offset; node: Node }[]
//   private readonly mode: 'tuple' | 'list'

//   constructor(
//     path: Path,
//     because: Span,
//     constraints: Constraint[],
//     pairs: OffsetNode['pairs']
//   ) {
//     super(path, because, constraints)
//     this.pairs = pairs
//     this.mode = pairs.every(p => p.segment.hasIndex()) ? 'tuple' : 'list'
//   }

//   derrive(): Type {
//     throw new Error('not implemented yet')
//   }

//   extend(g: Globals, head: Segment | null, rest: Path, cons: Constraint): Node {
//     throw new Error('not implemented yet')
//   }
// }

class ListNode extends Node {
  public readonly kind = 'list'
  public readonly child: Node

  constructor(
    path: Path,
    because: Span,
    constraints: Constraint[],
    child: Node
  ) {
    super(path, because, constraints)
    this.child = child
  }

  derrive(): Type {
    return new List(this.child.derrive())
  }

  extend(g: Globals, head: Segment | null, rest: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    if (head === null) {
      throw errors.typeMismatchError({
        path: this.path,
        original: { type: this.derrive(), where: this.because },
        conflict: { type: cons.atomicType, where: cons.origin },
        template: g.template,
      })
    }

    if (head instanceof Offset) {
      if (head instanceof StaticOffset) {
        console.log('length >=', head.offset)
      }

      const newChild = this.child.extend(g, rest.head(), rest.rest(), cons)
      return new ListNode(
        this.path,
        this.because,
        this.constraints.concat(cons),
        newChild
      )
    }

    if (head instanceof Field) {
      throw errors.unsupportedFieldError({
        path: this.path,
        field: head,
        type: this.derrive(),
        where: cons.origin,
        original: this.because,
        template: g.template,
      })
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

class TupleNode extends Node {
  public readonly kind = 'tuple'
  public readonly members: { [offset: number]: Node }

  constructor(
    path: Path,
    because: Span,
    constraints: Constraint[],
    members: TupleNode['members']
  ) {
    super(path, because, constraints)
    this.members = members
  }

  derrive(): Type {
    const offsets = Object.keys(this.members)
      .map(str => parseInt(str, 10))
      .filter(num => isFinite(num) && num >= 0)
    const maxOffset = Math.max(0, ...offsets)
    const newMembers = Array.from({ length: maxOffset + 1 }).map((_, i) => {
      return this.members[i] ? this.members[i].derrive() : new Unknown()
    })
    return new Tuple(newMembers)
  }

  extend(g: Globals, head: Segment | null, rest: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    if (head === null) {
      throw errors.typeMismatchError({
        path: this.path,
        original: { type: this.derrive(), where: this.because },
        conflict: { type: cons.atomicType, where: cons.origin },
        template: g.template,
      })
    }

    if (head instanceof StaticOffset) {
      const oldMember = this.members[head.offset] as Node | undefined
      const newMember = oldMember
        ? oldMember.extend(g, rest.head(), rest.rest(), cons)
        : Node.create(g, this.path.concat(head), rest.rest(), cons)
      const newMembers = { ...this.members, [head.offset]: newMember }
      return new TupleNode(
        this.path,
        this.because,
        this.constraints.concat(cons),
        newMembers
      )
    } else if (head instanceof DynamicOffset) {
      throw new AssumptionError(this.path, List)
    }

    if (head instanceof Field) {
      throw errors.unsupportedFieldError({
        path: this.path,
        field: head,
        type: this.derrive(),
        where: cons.origin,
        original: this.because,
        template: g.template,
      })
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

class FieldNode extends Node {
  public readonly kind = 'field'
  public readonly pairs: { segment: Field; node: Node }[]

  constructor(
    path: Path,
    because: Span,
    constraints: Constraint[],
    pairs: FieldNode['pairs']
  ) {
    super(path, because, constraints)
    this.pairs = pairs
  }

  derrive(): Type {
    const fields = this.pairs.map(p => {
      return {
        name: p.segment.name,
        type: p.node.derrive(),
      }
    })

    return new Dict(fields)
  }

  extend(g: Globals, head: Segment | null, rest: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    if (head === null) {
      throw errors.typeMismatchError({
        path: this.path,
        original: { type: this.derrive(), where: this.because },
        conflict: { type: cons.atomicType, where: cons.origin },
        template: g.template,
      })
    }

    if (head instanceof Offset) {
      throw errors.unsupportedOffsetError({
        path: this.path,
        offset: head,
        type: this.derrive(),
        where: cons.origin,
        template: g.template,
      })
    }

    if (head instanceof Field) {
      if (this.pairs.some(p => p.segment.equalTo(head))) {
        const updatedPairs = this.pairs.map(p => {
          if (p.segment.equalTo(head)) {
            return {
              segment: head,
              node: p.node.extend(g, rest.head(), rest.rest(), cons),
            }
          } else {
            return p
          }
        })

        return new FieldNode(
          this.path,
          this.because,
          this.constraints.concat(cons),
          updatedPairs
        )
      } else {
        const newPair = {
          segment: head,
          node: Node.create(g, this.path.concat(head), rest.rest(), cons),
        }

        const updatedPairs = this.pairs.concat(newPair)

        return new FieldNode(
          this.path,
          this.because,
          this.constraints.concat(cons),
          updatedPairs
        )
      }
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}
