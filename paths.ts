import { Type, Unknown, Obj, List } from './types'

abstract class Segment {
  public abstract equalTo(other: Segment): boolean
  public abstract toString(): string
}

class Field extends Segment {
  constructor(public name: string) {
    super()
  }

  public equalTo(other: Segment): boolean {
    return other instanceof Field && other.name === this.name
  }

  public toJSON() {
    return {
      typ: 'field',
      name: this.name,
    }
  }

  public toString() {
    return '.' + this.name
  }
}

class Index extends Segment {
  public equalTo(other: Segment) {
    return other instanceof Index
  }

  public toString() {
    return '[]'
  }

  public toJSON() {
    return {
      typ: 'index',
    }
  }
}

export class Path {
  public static fromString(path: string): Path {
    if (path === '.') {
      return new Path()
    } else if (/^(\.[a-z]+)+$/i.test(path)) {
      return new Path(
        path
          .split('.')
          .slice(1)
          .map(f => new Field(f))
      )
    } else {
      throw new Error(`illegal path: "${path}"`)
    }
  }

  constructor(private segments: Segment[] = []) {}

  public length(): number {
    return this.segments.length
  }

  public head(): Segment | null {
    if (this.length() === 0) {
      return null
    } else {
      return this.segments[0]
    }
  }

  public rest(): Path {
    return new Path(this.segments.slice(1))
  }

  public hasHead(path: Path): boolean {
    if (path.length() > this.length()) {
      return false
    } else {
      return path.segments.every((seg, i) => seg.equalTo(this.segments[i]))
    }
  }

  public relativeTo(path: Path): Path {
    if (this.hasHead(path)) {
      return new Path(this.segments.slice(path.length()))
    } else {
      return this
    }
  }

  public toString(): string {
    if (this.length() === 0) {
      return '.'
    } else {
      return this.segments.map(s => s.toString()).join('')
    }
  }
}

export const lookup = (path: Path, ctx: Type): Type => {
  const first = path.head()
  if (first === null) {
    return ctx
  } else if (first instanceof Field) {
    if (ctx instanceof Unknown) {
      return new Unknown()
    } else if (ctx instanceof Obj) {
      return lookup(path.rest(), ctx.lookup(first.name))
    } else {
      throw new Error(`no field "${first.name}" on type ${ctx.toString()}`)
    }
  } else if (first instanceof Index) {
    if (ctx instanceof Unknown) {
      return new Unknown()
    } else if (ctx instanceof List) {
      return lookup(path.rest(), ctx.child)
    } else {
      throw new Error(`no index on type ${ctx.toString()}`)
    }
  } else {
    throw new Error(`unknown path segment`)
  }
}

const commonType = (combine: (t1: Type, t2: Type) => Type) => {
  const recurse = (path: Path, ctx: Type, cons: Type): Type => {
    const first = path.head()
    if (first === null) {
      return combine(ctx, cons)
    } else if (first instanceof Field) {
      if (ctx instanceof Unknown) {
        return new Obj({
          [first.name]: recurse(path.rest(), new Unknown(), cons),
        })
      } else if (ctx instanceof Obj) {
        return combine(
          new Obj({
            [first.name]: recurse(path.rest(), ctx.lookup(first.name), cons),
          }),
          ctx
        )
      } else {
        throw new Error(`no field "${first.name}" on type ${ctx.toString()}`)
      }
    } else if (first instanceof Index) {
      if (ctx instanceof Unknown) {
        return new List(recurse(path.rest(), new Unknown(), cons))
      } else if (ctx instanceof List) {
        return combine(new List(recurse(path.rest(), ctx.child, cons)), ctx)
      } else {
        throw new Error(`no index on type ${ctx.toString()}`)
      }
    } else {
      throw new Error(`unknown path segment`)
    }
  }
  return recurse
}

export const smallestCommonType = commonType((t1, t2) => t1.intersect(t2))

export const largestCommonType = commonType((t1, t2) => t1.union(t2))
