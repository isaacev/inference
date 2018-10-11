import { Point, paths, ast } from './syntax'
import { TemplateSyntaxError } from './errors'

const cannotIntersect = (t1: Type, t2: Type): never => {
  // FIXME: report error with location information
  throw new TemplateSyntaxError(
    new Point(1, 1),
    `unable to intersect ${t1.toString()} and ${t2.toString()}`
  )
}

export abstract class Type {
  public abstract intersect(typ: Type): Type
  public abstract union(typ: Type): Type
  public abstract toJSON(): { type: string }
  public abstract toString(): string
}

export class Unknown extends Type {
  public intersect(typ: Type): Type {
    return typ
  }

  public union(typ: Type): Type {
    return typ
  }

  public toJSON() {
    return { type: 'unknown' }
  }

  public toString() {
    return 'Unknown'
  }
}

export class Nil extends Type {
  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Nil) {
      return new Nil()
    } else if (typ instanceof Opt) {
      return new Nil()
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Nil) {
      return new Nil()
    } else if (typ instanceof Opt) {
      return typ
    } else {
      return new Opt(typ)
    }
  }

  public toJSON() {
    return { type: 'nil' }
  }

  public toString() {
    return 'Nil'
  }
}

export class Opt extends Type {
  constructor(public child: Type = new Unknown()) {
    super()
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Nil) {
      return new Nil()
    } else if (typ instanceof Opt) {
      return new Opt(this.child.intersect(typ.child))
    } else {
      return this.child.intersect(typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Nil) {
      return this
    } else if (typ instanceof Opt) {
      return new Opt(this.child.union(typ.child))
    } else {
      return new Opt(this.child.union(typ))
    }
  }

  public toJSON() {
    return { type: 'opt', child: this.child.toJSON() }
  }

  public toString() {
    return `${this.child.toString()}?`
  }
}

export class Val extends Type {
  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return new Val()
    } else if (typ instanceof Nil) {
      return cannotIntersect(this, typ)
    } else if (typ instanceof Opt) {
      return this.intersect(typ.child)
    } else {
      return typ
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Nil) {
      return new Opt(this)
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else {
      return this
    }
  }

  public toJSON() {
    return { type: 'val' }
  }

  public toString() {
    return 'Val'
  }
}

export class List extends Type {
  constructor(public child: Type = new Unknown()) {
    super()
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Unknown || typ instanceof Val) {
      return new List(this.child)
    } else if (typ instanceof Opt) {
      return this.intersect(typ.child)
    } else if (typ instanceof List) {
      return new List(this.child.intersect(typ.child))
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return new List(this.child)
    } else if (typ instanceof Nil) {
      return new Opt(new List(this.child))
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else if (typ instanceof List) {
      return new List(this.child.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toJSON() {
    return {
      type: 'list',
      child: this.child.toJSON(),
    }
  }

  public toString() {
    return `[${this.child.toString()}]`
  }
}

export class Obj extends Type {
  private pairs: [string, Type][]

  constructor(hash: { [key: string]: Type } = {}) {
    super()
    this.pairs = Object.keys(hash)
      .sort()
      .map(name => [name, hash[name]] as [string, Type])
  }

  private hasField(name: string): boolean {
    return this.pairs.some(([n]) => name === n)
  }

  private field(name: string): Type {
    for (const [n, t] of this.pairs) {
      if (n === name) {
        return t
      }
    }
    throw new Error(`unknown field: "${name}"`)
  }

  public toFields(): { [key: string]: Type } {
    return this.pairs.reduce(
      (hash, [name, typ]) => ((hash[name] = typ), hash),
      {} as { [key: string]: Type }
    )
  }

  public lookup(path: string): Type {
    if (this.hasField(path)) {
      return this.field(path)
    } else {
      return new Unknown()
    }
  }

  public intersect(typ: Type): Obj {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Val) {
      return this
    } else if (typ instanceof Opt) {
      return this.intersect(typ.child)
    } else if (typ instanceof Obj) {
      return Obj.merge(this, typ, (t1, t2) => t1.intersect(t2))
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Nil) {
      return new Opt(this)
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else if (typ instanceof Obj) {
      return Obj.merge(this, typ, (t1, t2) => t1.union(t2))
    } else {
      return new Val()
    }
  }

  public toString() {
    return `{ ${this.pairs.map(([n, t]) => `${n}:${t} `).join('')}}`
  }

  public toJSON() {
    return {
      type: 'obj',
      fields: this.pairs.map(pair => ({
        path: pair[0],
        type: pair[1].toJSON(),
      })),
    }
  }

  private static merge(obj1: Obj, obj2: Obj, fn: (t1: Type, t2: Type) => Type) {
    // Collect all the unique field names in both objects.
    // For consistency, sort field names alphabetically.
    const unifiedFieldNames = obj1.pairs
      .concat(obj2.pairs)
      .map(([n]) => n)
      .filter((n, i, a) => i === a.indexOf(n))
      .sort()

    // For each field name, union the types associated with that name.
    const unifiedPairs = unifiedFieldNames.map(
      (name): [string, Type] => {
        if (obj1.hasField(name) && obj2.hasField(name)) {
          return [name, fn(obj1.field(name), obj2.field(name))]
        } else if (obj1.hasField(name)) {
          return [name, obj1.field(name)]
        } else {
          return [name, obj2.field(name)]
        }
      }
    )

    // Convert the Array<[field, type]> to a Map<field, type> structure.
    const unifiedHash = unifiedPairs.reduce(
      (hash, [name, typ]) => ((hash[name] = typ), hash),
      {} as { [key: string]: Type }
    )

    return new Obj(unifiedHash)
  }
}

export class Str extends Type {
  constructor(public value?: string) {
    super()
  }

  public hasValue(): boolean {
    return this.value !== undefined
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Str) {
      if (this.value === typ.value) {
        return new Str(this.value)
      } else if (!this.hasValue() && typ.hasValue()) {
        return new Str(typ.value)
      } else if (this.hasValue() && !typ.hasValue()) {
        return new Str(this.value)
      } else {
        return cannotIntersect(this, typ)
      }
    } else if (typ instanceof Unknown || typ instanceof Val) {
      return new Str()
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Str) {
      return this.value === typ.value ? new Str(this.value) : new Str()
    } else if (typ instanceof Unknown || typ instanceof Val) {
      return new Str()
    } else if (typ instanceof Nil) {
      return new Opt(this)
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toJSON() {
    return { type: 'str', value: this.value }
  }

  public toString() {
    if (this.value === undefined) {
      return 'Str'
    } else if (this.value.length > 8) {
      return `Str("${this.value.slice(0, 8)}...")`
    } else {
      return `Str("${this.value}")`
    }
  }
}

export class Num extends Type {
  constructor(public value?: number) {
    super()
  }

  public hasValue(): boolean {
    return this.value !== undefined
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Num) {
      if (this.value === typ.value) {
        return new Num(this.value)
      } else if (!this.hasValue() && typ.hasValue()) {
        return new Num(typ.value)
      } else if (this.hasValue() && !typ.hasValue()) {
        return new Num(this.value)
      } else {
        return cannotIntersect(this, typ)
      }
    } else if (typ instanceof Unknown || typ instanceof Val) {
      return new Num()
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Num) {
      return this.value === typ.value ? new Num(this.value) : new Num()
    } else if (typ instanceof Unknown || typ instanceof Val) {
      return new Num()
    } else if (typ instanceof Nil) {
      return new Opt(this)
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toJSON() {
    return { type: 'int', value: this.value }
  }

  public toString() {
    if (this.value === undefined) {
      return 'Num'
    } else {
      return `Num(${this.value})`
    }
  }
}

export class Bool extends Type {
  constructor(public value?: boolean) {
    super()
  }

  public hasValue(): boolean {
    return this.value !== undefined
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Bool) {
      if (this.value === typ.value) {
        return new Bool(this.value)
      } else if (!this.hasValue() && typ.hasValue()) {
        return new Bool(typ.value)
      } else if (this.hasValue() && !typ.hasValue()) {
        return new Bool(this.value)
      } else {
        return cannotIntersect(this, typ)
      }
    } else if (typ instanceof Unknown || typ instanceof Val) {
      return new Bool()
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Bool) {
      return this.value === typ.value ? new Bool(this.value) : new Bool()
    } else if (typ instanceof Unknown || typ instanceof Val) {
      return new Bool()
    } else if (typ instanceof Nil) {
      return new Opt(this)
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toJSON() {
    return { type: 'bool', value: this.value }
  }

  public toString() {
    if (this.value === undefined) {
      return 'Bool'
    } else if (this.value) {
      return 'Bool(T)'
    } else {
      return 'Bool(F)'
    }
  }
}

export const lookup = (path: paths.Path, ctx: Type): Type => {
  const first = path.head()
  if (first === null) {
    return ctx
  } else if (first instanceof paths.Field) {
    if (ctx instanceof Unknown) {
      return new Unknown()
    } else if (ctx instanceof Obj) {
      return lookup(path.rest(), ctx.lookup(first.name))
    } else {
      throw new Error(`no field "${first.name}" on type ${ctx.toString()}`)
    }
  } else if (first instanceof paths.Index) {
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
  const recurse = (path: paths.Path, ctx: Type, cons: Type): Type => {
    const first = path.head()
    if (first === null) {
      return combine(ctx, cons)
    } else if (first instanceof paths.Field) {
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
    } else if (first instanceof paths.Index) {
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

export namespace scope {
  export abstract class Scope {
    public children: Scope[]

    constructor(public node: ast.Node, public context: Type) {
      this.children = []
    }

    public lookup(path: paths.Path): Type {
      return lookup(path, this.context)
    }

    public abstract constrain(path: paths.Path, typ: Type): void

    public abstract propogate(path: paths.Path, typ: Type): void

    public toString(): string {
      return this.context.toString()
    }
  }

  export class Root extends Scope {
    public constrain(path: paths.Path, typ: Type) {
      this.context = smallestCommonType(path, this.context, typ)
    }

    public propogate(path: paths.Path, typ: Type) {
      this.context = largestCommonType(path, this.context, typ)
    }
  }

  export abstract class ChildScope extends Scope {
    constructor(
      public parent: Scope,
      public path: paths.Path,
      node: ast.Node,
      context?: Type
    ) {
      super(node, context ? context : parent.lookup(path))
      this.parent.children.push(this)
    }
  }

  export class Cond extends ChildScope {
    constructor(
      parent: Scope,
      path: paths.Path,
      node: ast.Node,
      context: Type = parent.lookup(path)
    ) {
      if (context instanceof Unknown) {
        super(parent, path, node, new Unknown())
        this.parent.constrain(this.path, new Opt())
      } else if (context instanceof Opt) {
        super(parent, path, node, context.child)
      } else if (context instanceof Nil) {
        super(parent, path, node, context)
        // console.warn('conditional will never be triggered')
      } else {
        super(parent, path, node, context)
        // console.warn('conditional is not necessary')
      }
    }

    public constrain(path: paths.Path, typ: Type) {
      if (path.hasHead(this.path)) {
        // Constraint directly affect the conditional block.
        const relpath = path.relativeTo(this.path)
        this.context = smallestCommonType(relpath, this.context, typ)
        this.parent.propogate(this.path, new Opt(this.context))
      } else {
        // Constraint directly impacts parent scope.
        this.parent.constrain(path, typ)
      }
    }

    public propogate(path: paths.Path, typ: Type) {
      if (path.hasHead(this.path)) {
        // Constraint directly affect the conditional block.
        const relpath = path.relativeTo(this.path)
        this.context = largestCommonType(relpath, this.context, typ)
        this.parent.propogate(this.path, new Opt(this.context))
      } else {
        // Constraint directly impacts parent scope.
        this.parent.constrain(path, typ)
      }
    }
  }

  export class With extends ChildScope {
    constructor(
      parent: Scope,
      path: paths.Path,
      node: ast.Node,
      context?: Type
    ) {
      super(parent, path, node, context)
      this.parent.constrain(this.path, new Unknown())
    }

    public constrain(path: paths.Path, typ: Type) {
      this.context = smallestCommonType(path, this.context, typ)
      this.parent.constrain(this.path, this.context)
    }

    public propogate(path: paths.Path, typ: Type) {
      this.context = largestCommonType(path, this.context, typ)
      this.parent.constrain(this.path, this.context)
    }
  }

  export class Loop extends ChildScope {
    constructor(
      parent: Scope,
      path: paths.Path,
      node: ast.Node,
      context?: Type
    ) {
      if (context instanceof Unknown) {
        super(parent, path, node, new Unknown())
        this.parent.constrain(this.path, new List())
      } else if (context instanceof List) {
        super(parent, path, node, context.child)
      } else {
        // This branch should throw an error.
        super(parent, path, node, context)
        this.parent.constrain(this.path, new List())
      }
    }

    public constrain(path: paths.Path, typ: Type) {
      this.context = smallestCommonType(path, this.context, typ)
      this.parent.propogate(this.path, new List(this.context))
    }

    public propogate(path: paths.Path, typ: Type) {
      this.context = largestCommonType(path, this.context, typ)
      this.parent.propogate(this.path, new List(this.context))
    }
  }

  export const infer = (root: ast.Root): Root => {
    const scope = new Root(root, new Unknown())
    root.children.forEach(node => nodeToScope(scope, node))
    return scope
  }

  const nodeToScope = (scope: Scope, node: ast.Node) => {
    if (node instanceof ast.InlineAction) {
      exprToScope(scope, node.expr)
    } else if (node instanceof ast.BlockAction) {
      if (node.name === 'cond') {
        const subscope = new Cond(
          scope,
          paths.Path.fromString(node.field),
          node
        )
        node.children.forEach(subnode => nodeToScope(subscope, subnode))
      } else if (node.name === 'with') {
        const subscope = new With(
          scope,
          paths.Path.fromString(node.field),
          node
        )
        node.children.forEach(subnode => nodeToScope(subscope, subnode))
      } else if (node.name === 'loop') {
        const subscope = new Loop(
          scope,
          paths.Path.fromString(node.field),
          node
        )
        node.children.forEach(subnode => nodeToScope(subscope, subnode))
      } else {
        throw new TemplateSyntaxError(node.range, `unknown block`)
      }
    }
  }

  const exprToScope = (scope: Scope, expr: ast.Expression) => {
    if (expr instanceof ast.Field) {
      scope.constrain(expr.path, new Str())
    } else {
      throw new TemplateSyntaxError(expr.range, `unknown expression`)
    }
  }
}
