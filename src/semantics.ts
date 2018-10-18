import * as paths from './paths'
import * as tmpl from './grammar'

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
    public members: Type[]

    constructor(m0: Type, m1: Type, ms: Type[]) {
      super()
      this.members = [m0, m1, ...ms]
    }

    public accepts(that: Nilable): boolean {
      if (that instanceof Or) {
        return that.members.every(member => this.accepts(member))
      } else {
        return this.members.some(member => member.accepts(that))
      }
    }

    public toJSON() {
      return { type: 'or', members: this.members }
    }

    public toString(): string {
      return this.members.map(member => member.toString()).join('|')
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

  export class StrValue extends Type {
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
        throw new Error(`no field "${first.name}" on type ${ctx.toString()}`)
      }
    } else if (first instanceof paths.Index) {
      if (ctx instanceof Unknown) {
        return new Unknown()
      } else if (ctx instanceof List) {
        return followPath(path.rest(), ctx.element)
      } else {
        throw new Error(`no index on type ${ctx.toString()}`)
      }
    } else {
      throw new Error(`unknown path segment`)
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
    }

    if (t1.accepts(t2)) {
      return t1
    } else if (t2.accepts(t1)) {
      return t2
    } else {
      throw new Error(`cannot unify ${t1} and ${t2}`)
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
      throw new Error(`cannot intersect ${t1} and ${t2}`)
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
          throw new Error(`no field "${first.name}" on type ${ctx}`)
        }
      } else if (first instanceof paths.Index) {
        if (ctx instanceof Unknown) {
          return new List(rec(path.rest(), new Unknown(), cons))
        } else if (ctx instanceof List) {
          return combine(ctx, new List(rec(path.rest(), ctx.element, cons)))
        } else {
          throw new Error(`no index on type ${ctx}`)
        }
      } else {
        throw new Error(`unknown path segment`)
      }
    }
    return rec
  }

  export const largestCommonType = commonType(unify)

  export const smallestCommonType = commonType(intersect)

  const flattenMembers = (ts: Type[]): Type[] => {
    return ts
      .map(t => {
        if (t instanceof Or) {
          return flattenMembers(t.members)
        } else {
          return [t]
        }
      })
      .reduce((flat, nested) => flat.concat(nested), [])
  }

  const maximalTypes = <T extends Type>(ts: T[]): T[] => {
    let maximal = [] as T[]
    ts.forEach(t => {
      if (maximal.some(m => m.accepts(t))) {
        // There is already some type in `maximal` that accepts `t`.
        return
      } else {
        // Remove any members of `maximal` that are accepted by `t`.
        maximal = maximal.filter(m => t.accepts(m) === false).concat(t)
      }
    })
    return maximal
  }

  const isType = (T: typeof Type, t: Type): boolean => {
    return t instanceof T
  }

  const hasType = (T: typeof Type, ts: Type[]): boolean => {
    return ts.some(isType.bind(null, T))
  }

  export const simplify = (ts: Type[]): Type => {
    ts = flattenMembers(ts).reduce(
      (acc, t) => {
        if (acc.some(m => m.accepts(t))) {
          // `t` is a subtype of some types in `acc`.
          return acc
        } else if (acc.some(m => t.accepts(m))) {
          // `t` is a supertype of some types in `acc`.
          return acc.filter(m => !t.accepts(m)).concat(t)
        } else {
          // `t` is neither a supertype nor a subtype of any types in `acc`.
          return acc.concat(t)
        }
      },
      [] as Type[]
    )

    // If `ts` contains both 'True' and 'False', replace with 'Bool'.
    if (hasType(True, ts) && hasType(False, ts)) {
      ts = ts.filter(t => !isType(Bool, t)).concat(new Bool())
    }

    if (ts.length < 2) {
      return ts[0]
    } else {
      return new Or(ts[0], ts[1], ts.slice(2))
    }
  }
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

  export class Is extends ChildScope {
    constructor(parent: Scope, context: types.Type) {
      super(parent, new paths.Path(), context)
    }

    public constrain(path: paths.Path, typ: types.Type) {
      this.context = types.smallestCommonType(path, this.context, typ)
    }

    public propogate(path: paths.Path, typ: types.Type) {
      this.context = types.largestCommonType(path, this.context, typ)
    }

    public toString() {
      return `is ${this.context.toString()}`
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
      case 'is':
        inferIs(scope, stmt)
        break
      case 'loop':
        inferLoop(scope, stmt)
        break
    }
  }

  const inferType = (struct: tmpl.Type): types.Type => {
    switch (struct.type) {
      case 'list':
        if (struct.element) {
          return new types.List(inferType(struct.element))
        } else {
          return new types.List()
        }
      case 'str':
        if (struct.value) {
          return new types.StrValue(struct.value)
        } else {
          return new types.Str()
        }
      case 'num':
        return new types.Num()
      case 'bool':
        return new types.Bool()
      case 'true':
        return new types.True()
      case 'false':
        return new types.False()
      default:
        throw new Error('unknown type: ' + JSON.stringify(struct))
    }
  }

  const inferInline = (scope: Scope, stmt: tmpl.Inline) => {
    inferExpr(scope, stmt.field)
  }

  const inferWith = (scope: Scope, stmt: tmpl.WithBlock) => {
    const subscope = new With(scope, paths.Path.fromFields(stmt.field.segments))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))
  }

  const inferIs = (scope: Scope, stmt: tmpl.IsBlock) => {
    const union = [stmt, ...stmt.clauses].reduce(
      (acc, branch, i) => {
        const guard = inferType(branch.constraint)
        const subscope = new Is(scope, guard)
        branch.stmts.forEach(stmt => inferStmt(subscope, stmt))

        if (acc.length === 0) {
          return [subscope.context]
        } else {
          const union = types.simplify(acc)
          if (union.accepts(subscope.context)) {
            console.error('branch #' + i + ' is unreachable')
            return acc
          } else if (union instanceof types.Or) {
            return union.members.concat(subscope.context)
          } else {
            return [union, subscope.context]
          }
        }
      },
      [] as types.Type[]
    )

    scope.constrain(new paths.Path(), types.simplify(union))
  }

  const inferLoop = (scope: Scope, stmt: tmpl.LoopBlock) => {
    const path = paths.Path.fromFields(stmt.field.segments)
    const subscope = new Loop(scope, path, scope.lookup(path))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))
  }

  const inferExpr = (scope: Scope, expr: tmpl.Expression) => {
    switch (expr.type) {
      case 'field':
        scope.constrain(paths.Path.fromFields(expr.segments), new types.Str())
        break
    }
  }
}
