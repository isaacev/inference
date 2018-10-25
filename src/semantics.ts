import * as paths from './paths'
import * as tmpl from './grammar'

export class TypeError {
  constructor(public message: string) {}
}

export namespace types {
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

  export type Pair = { key: string; value: Nilable }

  export class Dict extends Type {
    constructor(public pairs: Pair[]) {
      super()
    }

    public keys() {
      return this.pairs.map(pair => pair.key)
    }

    public hasKey(key: string): boolean {
      return this.pairs.some(pair => pair.key === key)
    }

    public getValue(key: string): Nilable {
      for (const pair of this.pairs) {
        if (pair.key === key) {
          return pair.value
        }
      }
      return new Unknown()
    }

    public accepts(that: Nilable): boolean {
      if (that instanceof Dict) {
        return this.pairs.every(pair => {
          return pair.value.accepts(that.getValue(pair.key))
        })
      } else {
        return false
      }
    }

    public toJSON() {
      return { type: 'dict', pairs: this.pairs }
    }

    public toString() {
      return `{ ${this.pairs
        .map(pair => `${pair.key}:${pair.value} `)
        .join('')}}`
    }

    public static merge(t1: Dict, t2: Dict, fn: Infix): Dict {
      // Collect all unique keys in both objects.
      const unifiedKeys = t1
        .keys()
        .concat(t2.keys())
        .filter((k, i, a) => i === a.indexOf(k))

      // For each key, union its associated types.
      const unifiedPairs: Pair[] = unifiedKeys.map(key => {
        if (t1.hasKey(key) && t2.hasKey(key)) {
          return { key, value: fn(t1.getValue(key), t2.getValue(key)) }
        } else if (t1.hasKey(key)) {
          return { key, value: t1.getValue(key) }
        } else {
          return { key, value: t2.getValue(key) }
        }
      })

      return new Dict(unifiedPairs)
    }
  }

  export class List extends Type {
    constructor(public element: Type = new Unknown()) {
      super()
    }

    public accepts(that: Nilable): boolean {
      if (that instanceof List) {
        return this.element.accepts(that.element)
      } else {
        return false
      }
    }

    public toJSON() {
      return { type: 'list', element: this.element }
    }

    public toString(): string {
      return `[${this.element.toString()}]`
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

  export const followPath = (path: paths.Path, ctx: Nilable): Nilable => {
    const first = path.head()
    if (first === null) {
      return ctx
    } else if (first instanceof paths.Field) {
      if (ctx instanceof Unknown) {
        return new Unknown()
      } else if (ctx instanceof Dict) {
        return followPath(path.rest(), ctx.getValue(first.name))
      } else {
        throw new TypeError(
          `no field "${first.name}" on type ${ctx.toString()}`
        )
      }
    } else if (first instanceof paths.Index) {
      if (ctx instanceof Unknown) {
        return new Unknown()
      } else if (ctx instanceof List) {
        return followPath(path.rest(), ctx.element)
      } else {
        throw new TypeError(`no index on type ${ctx.toString()}`)
      }
    } else if (first instanceof paths.Branch) {
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
    }

    if (t1.accepts(t2)) {
      return t1
    } else if (t2.accepts(t1)) {
      return t2
    } else {
      throw new TypeError(`cannot unify ${t1} and ${t2}`)
    }
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
    const rec = (path: paths.Path, ctx: Nilable, cons: Nilable): Nilable => {
      const first = path.head()
      if (first === null) {
        return combine(ctx, cons)
      } else if (first instanceof paths.Field) {
        if (ctx instanceof Unknown) {
          return new Dict([
            {
              key: first.name,
              value: rec(path.rest(), new Unknown(), cons),
            },
          ])
        } else if (ctx instanceof Dict) {
          return combine(
            ctx,
            new Dict([
              {
                key: first.name,
                value: rec(path.rest(), ctx.getValue(first.name), cons),
              },
            ])
          )
        } else {
          throw new TypeError(`no field "${first.name}" on type ${ctx}`)
        }
      } else if (first instanceof paths.Index) {
        if (ctx instanceof Unknown) {
          return new List(rec(path.rest(), new Unknown(), cons))
        } else if (ctx instanceof List) {
          return combine(ctx, new List(rec(path.rest(), ctx.element, cons)))
        } else {
          throw new TypeError(`no index on type ${ctx}`)
        }
      } else if (first instanceof paths.Branch) {
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
}

export namespace scope {
  export abstract class Scope {
    public children: Scope[]

    constructor(public context: types.Type) {
      this.children = []
    }

    public lookup(path: paths.Path): types.Type {
      return types.followPath(path, this.context)
    }

    public abstract constrain(path: paths.Path, typ: types.Type): void

    public abstract propogate(path: paths.Path, typ: types.Type): void

    public abstract inheritance(): Scope[]

    public abstract toString(): string
  }

  export class Root extends Scope {
    public constrain(path: paths.Path, typ: types.Type) {
      this.context = types.smallestCommonType(path, this.context, typ)
    }

    public propogate(path: paths.Path, typ: types.Type) {
      this.context = types.largestCommonType(path, this.context, typ)
    }

    public inheritance(): Scope[] {
      return [this]
    }

    public toString() {
      return `root ${this.context.toString()}`
    }
  }

  export abstract class ChildScope extends Scope {
    constructor(
      public parent: Scope,
      public path: paths.Path,
      context?: types.Type
    ) {
      super(context ? context : parent.lookup(path))
      this.parent.children.push(this)
    }

    public inheritance(): Scope[] {
      return [this, ...this.parent.inheritance()]
    }
  }

  export class With extends ChildScope {
    constructor(parent: Scope, path: paths.Path, context?: types.Type) {
      super(parent, path, context)
      this.parent.constrain(this.path, new types.Unknown())
    }

    public constrain(path: paths.Path, typ: types.Type) {
      this.context = types.smallestCommonType(path, this.context, typ)
      this.parent.constrain(this.path, this.context)
    }

    public propogate(path: paths.Path, typ: types.Type) {
      this.context = types.largestCommonType(path, this.context, typ)
      this.parent.constrain(this.path, this.context)
    }

    public toString() {
      return `with ${this.context.toString()}`
    }
  }

  export class Loop extends ChildScope {
    constructor(parent: Scope, path: paths.Path, context?: types.Type) {
      if (context instanceof types.Unknown) {
        super(parent, path, new types.Unknown())
        this.parent.constrain(this.path, new types.List())
      } else if (context instanceof types.List) {
        super(parent, path, context.element)
      } else {
        // This branch should throw an error.
        super(parent, path, context)
        this.parent.constrain(this.path, new types.List())
      }
    }

    public constrain(path: paths.Path, typ: types.Type) {
      this.context = types.smallestCommonType(path, this.context, typ)
      this.parent.propogate(this.path, new types.List(this.context))
    }

    public propogate(path: paths.Path, typ: types.Type) {
      this.context = types.largestCommonType(path, this.context, typ)
      this.parent.propogate(this.path, new types.List(this.context))
    }

    public toString() {
      return `loop ${this.context.toString()}`
    }
  }

  export class Branch extends ChildScope {
    constructor(parent: Scope, path: paths.Path, ctx?: types.Type) {
      super(parent, path, ctx)
    }

    public constrain(path: paths.Path, typ: types.Type) {
      this.context = types.smallestCommonType(path, this.context, typ)
      this.parent.propogate(this.path.concat(path), typ)
    }

    public propogate(path: paths.Path, typ: types.Type) {
      this.context = types.largestCommonType(path, this.context, typ)
      this.parent.propogate(this.path.concat(path), typ)
    }

    public toString() {
      return `branch ${this.context.toString()}`
    }
  }

  export const infer = (stmts: tmpl.Statements): Root => {
    const scope = new Root(new types.Unknown())
    stmts.forEach(stmt => inferStmt(scope, stmt))
    return scope
  }

  const inferStmt = (scope: Scope, stmt: tmpl.Statement) => {
    switch (stmt.type) {
      case 'inline':
        inferInline(scope, stmt)
        break
      case 'with':
        inferWith(scope, stmt)
        break
      case 'loop':
        inferLoop(scope, stmt)
        break
      case 'match':
        inferMatch(scope, stmt)
        break
    }
  }

  const inferInline = (scope: Scope, stmt: tmpl.Inline) => {
    scope.constrain(paths.Path.fromFields(stmt.field.segments), new types.Str())
  }

  const inferWith = (scope: Scope, stmt: tmpl.WithBlock) => {
    const subscope = new With(scope, paths.Path.fromFields(stmt.field.segments))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))
  }

  const inferLoop = (scope: Scope, stmt: tmpl.LoopBlock) => {
    const path = paths.Path.fromFields(stmt.field.segments)
    const subscope = new Loop(scope, path, scope.lookup(path))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))
  }

  const inferMatch = (scope: Scope, stmt: tmpl.MatchBlock) => {
    const basePath = paths.Path.fromFields(stmt.field.segments)

    // Analyze initial case.
    const branchPath = basePath.concat(new paths.Branch(0))
    const subscope = new Branch(scope, branchPath, scope.lookup(branchPath))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))

    // Analyze additional cases.
    stmt.clauses.forEach((stmts, index) => {
      const branchPath = basePath.concat(new paths.Branch(index + 1))
      const subscope = new Branch(scope, branchPath, scope.lookup(branchPath))
      stmts.forEach(stmt => inferStmt(subscope, stmt))
    })
  }
}
