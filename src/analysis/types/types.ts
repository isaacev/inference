import { NumPredicate, AtLeast } from './predicates'
import { TypeError } from './errors'
import { Path, Segment, Field, Index, Branch } from './paths'

export type Nilable = Type | Nil

type Infix = (t1: Nilable, t2: Nilable) => Nilable

export class Nil {
  public accepts(that: Nilable): boolean {
    if (that instanceof Nil) {
      return true
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'nil' }
  }

  public toString() {
    return 'Nil'
  }
}

export abstract class Type {
  public abstract accepts(that: Nilable): boolean
  public abstract toJSON(): { type: string }
  public abstract toString(): string
}

export class Unknown extends Type {
  public accepts(that: Nilable): boolean {
    return true
  }

  public toJSON() {
    return { type: 'unknown' }
  }

  public toString() {
    return 'Unknown'
  }
}

export class Or extends Type {
  constructor(public branches: Type[] = []) {
    super()
  }

  public accepts(that: Nilable): boolean {
    if (that instanceof Or) {
      return that.branches.every(b => this.accepts(b))
    } else {
      return this.branches.some(b => b.accepts(that))
    }
  }

  public toJSON() {
    return { type: 'or', branches: this.branches }
  }

  public toString(): string {
    return `Or(${this.branches.map(b => b.toString()).join(' ')})`
  }

  public static unify(t1: Or, t2: Or): Type {
    // Hacky and not logically complete.
    if (t1.branches.length === t2.branches.length) {
      return new Or(t1.branches.map((b1, i) => unify(b1, t2.branches[i])))
    } else {
      return t1.branches.length > t2.branches.length ? t1 : t2
    }
  }
}

export class Dict extends Type {
  constructor(public fields: { name: string; type: Nilable }[]) {
    super()
  }

  public fieldNames() {
    return this.fields.map(pair => pair.name)
  }

  public hasField(name: string): boolean {
    return this.fields.some(field => field.name === name)
  }

  public getType(name: string): Nilable {
    for (const field of this.fields) {
      if (field.name === name) {
        return field.type
      }
    }
    return new Unknown()
  }

  public accepts(that: Nilable): boolean {
    if (that instanceof Dict) {
      return this.fields.every(field => {
        return field.type.accepts(that.getType(field.name))
      })
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'dict', pairs: this.fields }
  }

  public toString() {
    return `{ ${this.fields
      .map(pair => `${pair.name}:${pair.type} `)
      .join('')}}`
  }

  public static merge(t1: Dict, t2: Dict, fn: Infix): Dict {
    // Collect all unique names in both objects.
    const unifiedNames = t1
      .fieldNames()
      .concat(t2.fieldNames())
      .filter((k, i, a) => i === a.indexOf(k))

    // For each name, union its associated types.
    const unifiedFields = unifiedNames.map(name => {
      if (t1.hasField(name) && t2.hasField(name)) {
        return { name, type: fn(t1.getType(name), t2.getType(name)) }
      } else if (t1.hasField(name)) {
        return { name, type: t1.getType(name) }
      } else {
        return { name, type: t2.getType(name) }
      }
    })

    return new Dict(unifiedFields)
  }
}

const repeatUnknowns = (len: number) => {
  const arr = [] as Nilable[]
  for (let i = 0; i < len; i++) {
    arr.push(new Unknown())
  }
  return arr
}

export class Tuple extends Type {
  constructor(public members: Type[]) {
    super()
  }

  public memberAt(index: number): Nilable {
    if (index < this.members.length) {
      return this.members[index]
    } else {
      return new Unknown()
    }
  }

  public accepts(that: Nilable): boolean {
    if (that instanceof Tuple) {
      return this.members.every((f, i) => f.accepts(that.memberAt(i)))
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'tuple', members: this.members }
  }

  public toString(): string {
    return `(${this.members.map(m => m.toString()).join(' ')})`
  }
}

export class List extends Type {
  constructor(
    public element: Type = new Unknown(),
    public length: NumPredicate = new AtLeast(0)
  ) {
    super()
  }

  public accepts(that: Nilable): boolean {
    if (that instanceof List) {
      return (
        this.element.accepts(that.element) &&
        this.length.acceptsPredicate(that.length)
      )
    } else if (that instanceof Tuple) {
      return (
        that.members.every(this.element.accepts.bind(this)) &&
        this.length.acceptsValue(that.members.length)
      )
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'list', element: this.element }
  }

  public toString(): string {
    return `[${this.element.toString()}; ${this.length.toString()}]`
  }
}

export class Str extends Type {
  public accepts(that: Nilable): boolean {
    if (that instanceof Str) {
      return true
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'str' }
  }

  public toString(): string {
    return 'Str'
  }
}

export class StrValue extends Str {
  constructor(public value: string) {
    super()
  }

  public accepts(that: Nilable): boolean {
    if (that instanceof StrValue) {
      return this.value === that.value
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'str', value: this.value }
  }

  public toString() {
    return `"${this.value.replace('\n', '\\n').replace('"', '\\"')}"`
  }
}

export class Num extends Type {
  public accepts(that: Nilable): boolean {
    if (that instanceof Num) {
      return true
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'num' }
  }

  public toString(): string {
    return 'Num'
  }
}

export class Bool extends Type {
  public accepts(that: Nilable): boolean {
    if (that instanceof Bool) {
      return true
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'bool' }
  }

  public toString(): string {
    return 'Bool'
  }
}

export class True extends Bool {
  public accepts(that: Nilable): boolean {
    if (that instanceof True) {
      return true
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'true' }
  }

  public toString(): string {
    return 'True'
  }
}

export class False extends Bool {
  public accepts(that: Nilable): boolean {
    if (that instanceof False) {
      return true
    } else {
      return false
    }
  }

  public toJSON() {
    return { type: 'false' }
  }

  public toString(): string {
    return 'False'
  }
}

export const followPath = (path: Path, ctx: Nilable): Nilable => {
  const first = path.head()
  if (first === null) {
    return ctx
  } else if (first instanceof Field) {
    if (ctx instanceof Unknown) {
      return new Unknown()
    } else if (ctx instanceof Dict) {
      return followPath(path.rest(), ctx.getType(first.name))
    } else {
      throw new TypeError(`no field "${first.name}" on type ${ctx.toString()}`)
    }
  } else if (first instanceof Index) {
    if (ctx instanceof Unknown) {
      return new Unknown()
    } else if (ctx instanceof List) {
      return followPath(path.rest(), ctx.element)
    } else {
      throw new TypeError(`no index on type ${ctx.toString()}`)
    }
  } else if (first instanceof Branch) {
    if (ctx instanceof Unknown) {
      return new Unknown()
    } else if (ctx instanceof Or) {
      return followPath(
        path.rest(),
        ctx.branches[first.branch] || new Unknown()
      )
    } else {
      throw new TypeError(`no branches on type ${ctx.toString()}`)
    }
  } else {
    throw new TypeError(`unknown path segment`)
  }
}

export const unify: Infix = (t1, t2) => {
  if (t1 instanceof Unknown) {
    return t2
  } else if (t2 instanceof Unknown) {
    return t1
  }

  if (t1 instanceof Dict && t2 instanceof Dict) {
    return Dict.merge(t1, t2, (t1, t2) => unify(t1, t2))
  } else if (t1 instanceof List && t2 instanceof List) {
    return new List(unify(t1.element, t2.element))
  } else if (t1 instanceof Or && t2 instanceof Or) {
    return Or.unify(t1, t2)
  } else if (t1 instanceof Tuple && t2 instanceof Tuple) {
    const len = Math.max(t1.members.length, t2.members.length)
    const members = [] as Nilable[]
    for (let i = 0; i < len; i++) {
      members.push(intersect(t1.memberAt(i), t2.memberAt(i)))
    }
    return new Tuple(members)
  }

  if (t1.accepts(t2)) {
    return t1
  } else if (t2.accepts(t1)) {
    return t2
  } else {
    throw new TypeError(`cannot unify ${t1} and ${t2}`)
  }
}

const intersectListAndTuple = (l: List, t: Tuple): List => {
  const element = t.members.reduce((elem, mem) => {
    return intersect(elem, mem)
  }, l.element)

  const length = new AtLeast(t.members.length)

  return new List(element, length)
}

export const intersect: Infix = (t1, t2) => {
  if (t1 instanceof Unknown) {
    return t2
  } else if (t2 instanceof Unknown) {
    return t1
  }

  if (t1 instanceof Dict && t2 instanceof Dict) {
    return Dict.merge(t1, t2, (t1, t2) => intersect(t1, t2))
  } else if (t1 instanceof List && t2 instanceof List) {
    return new List(intersect(t1.element, t2.element))
  } else if (t1 instanceof Tuple && t2 instanceof Tuple) {
    const len = Math.max(t1.members.length, t2.members.length)
    const members = [] as Nilable[]
    for (let i = 0; i < len; i++) {
      members.push(unify(t1.memberAt(i), t2.memberAt(i)))
    }
    return new Tuple(members)
  } else if (t1 instanceof List && t2 instanceof Tuple) {
    return intersectListAndTuple(t1, t2)
  } else if (t1 instanceof Tuple && t2 instanceof List) {
    return intersectListAndTuple(t2, t1)
  }

  if (t1.accepts(t2)) {
    return t2
  } else if (t2.accepts(t1)) {
    return t1
  } else {
    throw new TypeError(`cannot intersect ${t1} and ${t2}`)
  }
}

const commonType = (combine: Infix) => {
  const rec = (path: Path, ctx: Nilable, cons: Nilable): Nilable => {
    const first = path.head()
    if (first === null) {
      return combine(ctx, cons)
    } else if (first instanceof Field) {
      if (ctx instanceof Unknown) {
        return new Dict([
          {
            name: first.name,
            type: rec(path.rest(), new Unknown(), cons),
          },
        ])
      } else if (ctx instanceof Dict) {
        return combine(
          ctx,
          new Dict([
            {
              name: first.name,
              type: rec(path.rest(), ctx.getType(first.name), cons),
            },
          ])
        )
      } else {
        throw new TypeError(`no field "${first.name}" on type ${ctx}`)
      }
    } else if (first instanceof Index) {
      if (ctx instanceof Unknown) {
        if (first.hasIndex() && typeof first.index === 'number') {
          return new Tuple([
            ...repeatUnknowns(first.index),
            rec(path.rest(), new Unknown(), cons),
          ])
        } else {
          return new List(rec(path.rest(), new Unknown(), cons))
        }
      } else if (ctx instanceof Tuple) {
        if (first.hasIndex() && typeof first.index === 'number') {
          // Previously assumed that this context was a tuple. Continue to
          // assume that it's a tuple.
          console.log('was tuple, is tuple')
          return combine(
            ctx,
            new Tuple([
              ...repeatUnknowns(first.index),
              rec(path.rest(), ctx.memberAt(first.index), cons),
            ])
          )
        } else {
          // Previously assumed that this context was a tuple. Now it appears
          // to be a list. Convert the tuple to a list and set that list's
          // member type to the intersection of all tuple types.
          console.log('was tuple, is list')
          // return ctx.toList()
          return ctx
        }
      } else if (ctx instanceof List) {
        return combine(ctx, new List(rec(path.rest(), ctx.element, cons)))
      } else {
        throw new TypeError(`no index on type ${ctx}`)
      }
    } else if (first instanceof Branch) {
      if (ctx instanceof Unknown) {
        return new Or([rec(path.rest(), new Unknown(), cons)])
      } else if (ctx instanceof Or) {
        const branches = ctx.branches.slice()
        if (branches.length > first.branch) {
          branches[first.branch] = rec(
            path.rest(),
            branches[first.branch] || new Unknown(),
            cons
          )
          return new Or(branches)
        } else {
          branches.push(rec(path.rest(), new Unknown(), cons))
          return new Or(branches)
        }
      } else {
        throw new TypeError(`no branches on type ${ctx}`)
      }
    } else {
      throw new TypeError(`unknown path segment`)
    }
  }
  return rec
}

export const largestCommonType = commonType(unify)

export const smallestCommonType = commonType(intersect)
