import { paths } from './paths'
import { error } from './error'
import * as tmpl from './parse'
import { Location } from './grammar'

export namespace preds {
  export abstract class Predicate<T> {
    public abstract acceptsValue(val: T): boolean
    public abstract acceptsPredicate(pred: Predicate<T>): boolean
    public abstract toString(): string
  }

  export abstract class NumPredicate extends Predicate<number> {
    public static combine(p1: NumPredicate, p2: NumPredicate) {
      if (p1.acceptsPredicate(p2)) {
        return p1
      } else if (p2.acceptsPredicate(p1)) {
        return p2
      } else {
        throw new Error('cannot combine number predicates')
      }
    }
  }

  export class AtLeast extends NumPredicate {
    constructor(public min: number) {
      super()
    }

    public acceptsValue(val: number) {
      return val <= this.min
    }

    public acceptsPredicate(pred: NumPredicate): boolean {
      if (pred instanceof AtLeast) {
        return this.min <= pred.min
      } else {
        return false
      }
    }

    public toString() {
      return `(length >= ${this.min})`
    }
  }

  export class NonZero extends AtLeast {
    constructor() {
      super(1)
    }
  }

  export class Zero extends NumPredicate {
    public acceptsValue(val: number) {
      return val === 0
    }

    public acceptsPredicate(pred: NumPredicate): boolean {
      if (pred instanceof Zero) {
        return true
      } else {
        return false
      }
    }

    public toString() {
      return `(length == 0)`
    }
  }
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
      public length: preds.NumPredicate = new preds.AtLeast(0)
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
        throw new error.TypeError(
          `no field "${first.name}" on type ${ctx.toString()}`
        )
      }
    } else if (first instanceof paths.Index) {
      if (ctx instanceof Unknown) {
        return new Unknown()
      } else if (ctx instanceof List) {
        return followPath(path.rest(), ctx.element)
      } else {
        throw new error.TypeError(`no index on type ${ctx.toString()}`)
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
        throw new error.TypeError(`no branches on type ${ctx.toString()}`)
      }
    } else {
      throw new error.TypeError(`unknown path segment`)
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
      throw new error.TypeError(`cannot unify ${t1} and ${t2}`)
    }
  }

  const intersectListAndTuple = (l: List, t: Tuple): List => {
    const element = t.members.reduce((elem, mem) => {
      return intersect(elem, mem)
    }, l.element)

    const length = new preds.AtLeast(t.members.length)

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
      throw new error.TypeError(`cannot intersect ${t1} and ${t2}`)
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
          throw new error.TypeError(`no field "${first.name}" on type ${ctx}`)
        }
      } else if (first instanceof paths.Index) {
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
          throw new error.TypeError(`no index on type ${ctx}`)
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
          throw new error.TypeError(`no branches on type ${ctx}`)
        }
      } else {
        throw new error.TypeError(`unknown path segment`)
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
      } else if (context instanceof types.Tuple) {
        //   const list = context.toList()
        //   super(parent, path, list.element)
        //   console.log('>>>')
        //   this.parent.constrain(this.path, list)
        //   console.log('<<<')
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

  export const infer = (stmts: tmpl.Statement[]): Root => {
    const scope = new Root(new types.Unknown())
    stmts.forEach(stmt => inferStmt(scope, stmt))
    return scope
  }

  const inferStmt = (scope: Scope, stmt: tmpl.Statement) => {
    try {
      switch (stmt.type) {
        case 'inline':
          inferInline(scope, stmt)
          break
        case 'block':
          switch (stmt.name) {
            case 'with':
              inferWith(scope, stmt as tmpl.WithBlock)
              break
            case 'loop':
              inferLoop(scope, stmt as tmpl.LoopBlock)
              break
            case 'match':
              inferMatch(scope, stmt as tmpl.MatchBlock)
              break
          }
          break
      }
    } catch (err) {
      throw wrapIfTypeError(stmt.where, err)
    }
  }

  const inferInline = (scope: Scope, stmt: tmpl.Inline) => {
    scope.constrain(paths.Path.fromFields(stmt.field), new types.Str())
  }

  const inferWith = (scope: Scope, stmt: tmpl.WithBlock) => {
    const subscope = new With(scope, paths.Path.fromFields(stmt.field))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))
  }

  const inferLoop = (scope: Scope, stmt: tmpl.LoopBlock) => {
    const path = paths.Path.fromFields(stmt.field)
    const subscope = new Loop(scope, path, scope.lookup(path))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))

    // TODO: handle optional {{:empty}} clause
  }

  const inferMatch = (scope: Scope, stmt: tmpl.MatchBlock) => {
    const basePath = paths.Path.fromFields(stmt.field)

    // Analyze initial case.
    const branchPath = basePath.concat(new paths.Branch(0))
    const subscope = new Branch(scope, branchPath, scope.lookup(branchPath))
    stmt.stmts.forEach(stmt => inferStmt(subscope, stmt))

    // Analyze additional cases.
    stmt.orClauses.forEach((stmts, index) => {
      const branchPath = basePath.concat(new paths.Branch(index + 1))
      const subscope = new Branch(scope, branchPath, scope.lookup(branchPath))
      stmts.forEach(stmt => inferStmt(subscope, stmt))
    })
  }

  const wrapIfTypeError = (where: Location, err: any): never => {
    if (err instanceof error.TypeError) {
      throw new error.TemplateTypeError(where, err)
    } else {
      throw err
    }
  }
}
