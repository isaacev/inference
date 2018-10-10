const cannotIntersect = (t1: Type, t2: Type): never => {
  throw new Error(`unable to intersect ${t1.toString()} and ${t2.toString()}`)
}

export abstract class Type {
  /**
   * Returns true if `typ` is as or more restrictive than `this`. For example:
   * `{ }` DOES accept `{ foo:Bool }`
   * `{ foo:Bool }` DOES NOT accept `{ }`
   */
  public abstract accepts(typ: Type): boolean

  /**
   * Attempts to find the smallest type that satisfies both `this` and
   * `typ`. If no such type exists, throw an error.
   */
  public abstract intersect(typ: Type): Type

  /**
   * Attempts to find the smallest type that accepts both `this` and `typ`. For example:
   * Bool union Val? -> Val?
   * Bool union Unknown -> Bool
   * Bool union Unknown? -> Bool?
   * Nil union Val? -> Val?
   * Bool union Str -> Val
   * Nil union Str -> Str?
   */
  public abstract union(typ: Type): Type

  public abstract toString(): string

  public abstract toJSON(): { type: string }
}

export class Unknown extends Type {
  public accepts() {
    return true
  }

  public intersect(typ: Type): Type {
    return typ
  }

  public union(typ: Type): Type {
    return typ
  }

  public toString() {
    return 'Unknown'
  }

  public toJSON() {
    return { type: 'unknown' }
  }
}

/**
 * The Nil type represents the absence of a value.
 */
export class Nil extends Type {
  public accepts(typ: Type): boolean {
    if (typ instanceof Unknown) {
      return true
    } else {
      return typ instanceof Nil
    }
  }

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

  public toString() {
    return 'Nil'
  }

  public toJSON() {
    return { type: 'nil' }
  }
}

/**
 * The Val type represents a value that is known to exist.
 */
export class Val extends Type {
  public accepts(typ: Type): boolean {
    if (typ instanceof Unknown) {
      return true
    } else if (typ instanceof Nil || typ instanceof Opt) {
      return false
    } else {
      return true
    }
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Nil) {
      return cannotIntersect(this, typ)
    } else if (typ instanceof Opt) {
      return this.intersect(typ.child)
    } else {
      return typ
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Nil) {
      return new Opt()
    } else if (typ instanceof Opt) {
      return typ
    } else {
      return new Val()
    }
  }

  public toString() {
    return 'Val'
  }

  public toJSON() {
    return { type: 'val' }
  }
}

/**
 * The Opt type represents a value that could be Nil or some Val type.
 */
export class Opt extends Type {
  constructor(public child: Type = new Unknown()) {
    super()
  }

  public accepts(typ: Type): boolean {
    if (typ instanceof Nil) {
      return true
    } else if (typ instanceof Opt) {
      return this.child.accepts(typ.child)
    } else {
      return this.child.accepts(typ)
    }
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

  public toString() {
    return `${this.child.toString()}?`
  }

  public toJSON() {
    return { type: 'opt', child: this.child.toJSON() }
  }
}

export class Bool extends Type {
  public accepts(typ: Type) {
    return typ instanceof Bool
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Val || typ instanceof Bool) {
      return new Bool()
    } else if (typ instanceof Opt) {
      return this.intersect(typ.child)
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Bool) {
      return new Bool()
    } else if (typ instanceof Nil) {
      return new Opt(new Bool())
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toString() {
    return 'Bool'
  }

  public toJSON() {
    return { type: 'bool' }
  }
}

export class Str extends Type {
  public accepts(typ: Type) {
    return typ instanceof Str
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Val || typ instanceof Str) {
      return new Str()
    } else if (typ instanceof Opt) {
      return this.intersect(typ.child)
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Str) {
      return new Str()
    } else if (typ instanceof Nil) {
      return new Opt(new Str())
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toString() {
    return 'Str'
  }

  public toJSON() {
    return { type: 'str' }
  }
}

export class Num extends Type {
  public accepts(typ: Type) {
    return typ instanceof Num
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Val || typ instanceof Num) {
      return new Num()
    } else if (typ instanceof Opt) {
      return this.intersect(typ.child)
    } else {
      return cannotIntersect(this, typ)
    }
  }

  public union(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Num) {
      return new Num()
    } else if (typ instanceof Nil) {
      return new Opt(new Num())
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toString() {
    return 'Num'
  }

  public toJSON() {
    return { type: 'num' }
  }
}

export class List extends Type {
  constructor(public child: Type = new Unknown()) {
    super()
  }

  public accepts(typ: Type): boolean {
    if (typ instanceof List) {
      return this.child.accepts(typ.child)
    } else {
      return false
    }
  }

  public intersect(typ: Type): Type {
    if (typ instanceof Unknown) {
      return this
    } else if (typ instanceof Val) {
      return this
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
      return this
    } else if (typ instanceof Nil) {
      return new Opt(this)
    } else if (typ instanceof Opt) {
      return new Opt(this.union(typ.child))
    } else if (typ instanceof List) {
      return new List(this.child.union(typ.child))
    } else {
      return new Val()
    }
  }

  public toString() {
    return `[${this.child.toString()}]`
  }

  public toJSON() {
    return { type: 'list', child: this.child.toJSON() }
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

  public accepts(typ: Type): boolean {
    if (typ instanceof Obj) {
      return this.pairs.every(([n, t1]) => {
        if (typ.hasField(n)) {
          const t2 = typ.field(n)
          return t1.accepts(t2)
        } else {
          return false
        }
      })
    } else {
      return cannotIntersect(this, typ)
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
