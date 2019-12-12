import { Constraint, ContextTrace } from '~/solver/constraints'

// Error tracking and rendering
import { Span } from '~/syntax'
import * as errors from '~/solver/errors'

// Paths and segments
import Path from '~/paths'
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

// Assumption management
import { Lessons, AssumptionBookmark } from './assumptions'
import { Snapshot } from './inference'
import Segment from '~/paths/segments'

interface Globals {
  template: string
  lessons: Lessons
  previousSnapshot: Snapshot
}

export abstract class Node {
  public abstract readonly kind: string

  constructor(
    public path: Path,
    public because: ContextTrace,
    public constraints: Constraint[]
  ) {}

  abstract derrive(): Type

  abstract extend(g: Globals, along: Path, cons: Constraint): Node

  static create(g: Globals, path: Path, rest: Path, cons: Constraint): Node {
    const head = rest.head()

    if (head === null) {
      if (cons.atomicType instanceof Unknown) {
        return new UnknownNode(path, cons.trace, [cons])
      } else {
        return new LeafNode(path, cons.trace, [cons], cons.atomicType)
      }
    }

    const nextNode = Node.create(g, path.concat(head), rest.rest(), cons)

    if (head instanceof Offset) {
      if (head instanceof DynamicOffset || g.lessons.shouldBe(path, List)) {
        return new ListNode(path, cons.trace, [cons], nextNode)
      } else if (head instanceof StaticOffset) {
        return new TupleNode(
          path,
          cons.trace,
          [cons],
          { [head.offset]: nextNode },
          new AssumptionBookmark(g.previousSnapshot, path)
        )
      }
    }

    if (head instanceof Field) {
      return new FieldNode(
        path,
        cons.trace,
        [cons],
        [{ segment: head, node: nextNode }]
      )
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

class UnknownNode extends Node {
  public readonly kind = 'unknown'

  derrive() {
    return new Unknown()
  }

  extend(g: Globals, along: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    const { head, rest } = along.split()

    if (head === null) {
      return new LeafNode(
        this.path,
        cons.trace,
        this.constraints.concat(cons),
        cons.atomicType
      )
    }

    const nextNode = Node.create(g, this.path.concat(head), rest, cons)

    if (head instanceof Offset) {
      const shouldBeList = g.lessons.shouldBe(this.path, List)
      if (head instanceof DynamicOffset || shouldBeList) {
        return new ListNode(
          this.path,
          cons.trace,
          this.constraints.concat(cons),
          nextNode
        )
      } else if (head instanceof StaticOffset) {
        return new TupleNode(
          this.path,
          cons.trace,
          this.constraints.concat(cons),
          { [head.offset]: nextNode },
          new AssumptionBookmark(g.previousSnapshot, this.path)
        )
      }
    }

    if (head instanceof Field) {
      return new FieldNode(
        this.path,
        cons.trace,
        this.constraints.concat(cons),
        [{ segment: head, node: nextNode }]
      )
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

export class EmptyNode extends Node {
  public readonly kind = 'empty'

  constructor() {
    super(
      new Path(),
      {
        location: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        parent: null,
      },
      []
    )
  }

  derrive() {
    return new Unknown()
  }

  extend(g: Globals, along: Path, cons: Constraint): Node {
    return Node.create(g, this.path, along, cons)
  }
}

class LeafNode extends Node {
  public readonly kind = 'leaf'

  constructor(
    path: Path,
    because: ContextTrace,
    constraints: Constraint[],
    public type: Str | Num | Bool
  ) {
    super(path, because, constraints)
  }

  derrive(): Type {
    return this.type
  }

  extend(g: Globals, along: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    const { head } = along.split()

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
          conflict: { type: cons.atomicType, where: cons.trace },
          template: g.template,
        })
      }
    }

    if (head instanceof Offset) {
      throw errors.unsupportedOffsetError({
        path: this.path,
        offset: head,
        type: this.type,
        where: cons.trace,
        template: g.template,
      })
    }

    if (head instanceof Field) {
      throw errors.unsupportedFieldError({
        path: this.path,
        field: head,
        type: this.type,
        where: cons.trace,
        original: this.because,
        template: g.template,
      })
    }

    throw new Error(`unknown segment type: '${head.toString()}'`)
  }
}

const notNull = <T>(t: T | null): t is T => t !== null

class ListNode extends Node {
  public readonly kind = 'list'
  public readonly child: Node

  constructor(
    path: Path,
    because: ContextTrace,
    constraints: Constraint[],
    child: Node
  ) {
    super(path, because, constraints)
    this.child = child
  }

  derrive(): Type {
    const staticOffsets = this.constraints
      .map(c => c.path.cut(this.path))
      .filter(notNull)
      .map(p => p.head())
      .filter(notNull)
      .filter((s: Segment): s is Offset => s instanceof Offset)
      .map(o => (o instanceof StaticOffset ? o.offset : 0))
    return new List(this.child.derrive(), Math.max(...staticOffsets))
  }

  extend(g: Globals, along: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    const { head, rest } = along.split()

    if (head === null) {
      throw errors.typeMismatchError({
        path: this.path,
        original: { type: this.derrive(), where: this.because },
        conflict: { type: cons.atomicType, where: cons.trace },
        template: g.template,
      })
    }

    if (head instanceof Offset) {
      if (head instanceof StaticOffset) {
        console.log('length >=', head.offset)
      }

      const newChild = this.child.extend(g, rest, cons)
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
        where: cons.trace,
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
  public readonly bookmark: AssumptionBookmark

  constructor(
    path: Path,
    because: ContextTrace,
    constraints: Constraint[],
    members: TupleNode['members'],
    bookmark: AssumptionBookmark
  ) {
    super(path, because, constraints)
    this.members = members
    this.bookmark = bookmark
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

  extend(g: Globals, along: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    const { head, rest } = along.split()

    if (head === null) {
      throw errors.typeMismatchError({
        path: this.path,
        original: { type: this.derrive(), where: this.because },
        conflict: { type: cons.atomicType, where: cons.trace },
        template: g.template,
      })
    }

    if (head instanceof StaticOffset) {
      const oldMember = this.members[head.offset] as Node | undefined
      const newMember = oldMember
        ? oldMember.extend(g, rest, cons)
        : Node.create(g, this.path.concat(head), rest, cons)
      const newMembers = { ...this.members, [head.offset]: newMember }
      return new TupleNode(
        this.path,
        this.because,
        this.constraints.concat(cons),
        newMembers,
        this.bookmark
      )
    } else if (head instanceof DynamicOffset) {
      return this.bookmark.rollback(List)
    }

    if (head instanceof Field) {
      throw errors.unsupportedFieldError({
        path: this.path,
        field: head,
        type: this.derrive(),
        where: cons.trace,
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
    because: ContextTrace,
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

  extend(g: Globals, along: Path, cons: Constraint): Node {
    if (cons.atomicType instanceof Unknown) {
      return this
    }

    const { head, rest } = along.split()

    if (head === null) {
      throw errors.typeMismatchError({
        path: this.path,
        original: { type: this.derrive(), where: this.because },
        conflict: { type: cons.atomicType, where: cons.trace },
        template: g.template,
      })
    }

    if (head instanceof Offset) {
      throw errors.unsupportedOffsetError({
        path: this.path,
        offset: head,
        type: this.derrive(),
        where: cons.trace,
        template: g.template,
      })
    }

    if (head instanceof Field) {
      if (this.pairs.some(p => p.segment.equalTo(head))) {
        const updatedPairs = this.pairs.map(p => {
          if (p.segment.equalTo(head)) {
            return {
              segment: head,
              node: p.node.extend(g, rest, cons),
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
          node: Node.create(g, this.path.concat(head), rest, cons),
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
