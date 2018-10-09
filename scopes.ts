import { Type, Unknown, Obj, Opt, List } from './types'
import { Node } from './parser'

export abstract class Scope {
  // The `fields` object records constraints satisfied by the current scope.
  public fields: { [path: string]: Type } = {}

  constructor(public node: Node) {}

  public start() {
    return this.node.start()
  }

  public end() {
    return this.node.end()
  }

  public abstract lookup(path: string): Type

  // When new constraints are added to child scopes, those constraints
  // have to be passed to parent scopes often with modification. This
  // method is provided by all scope types to facilitate that exchange.
  public abstract propogate(path: string, typ: Type): void

  // Requires that a constraint be met for a block to be rendered.
  public condition(path: string, typ: Type): void {
    const original = this.fields[path] || new Unknown()
    const combined = original.intersect(typ)
    this.fields[path] = combined
    this.propogate(path, combined)
  }

  // Requires that a constraint be satisfied by the current scope.
  public constrain(path: string, typ: Type): void {
    const original = this.lookup(path)
    const combined = original.intersect(typ)
    this.propogate(path, combined)
  }

  public toString(name?: string): string {
    return (!!name ? name + ' ' : '') + new Obj(this.fields).toString()
  }
}

export class Root extends Scope {
  public lookup(path: string): Type {
    if (this.fields.hasOwnProperty(path)) {
      return this.fields[path]
    } else {
      return new Unknown()
    }
  }

  public propogate(path: string, typ: Type) {
    if (this.fields.hasOwnProperty(path)) {
      const original = this.fields[path]
      const combined = original.intersect(typ)
      this.fields[path] = combined
    } else {
      this.fields[path] = typ
    }
  }

  public toString(name?: string) {
    return super.toString(name || 'root')
  }
}

export class Cond extends Scope {
  constructor(public parent: Scope, public path: string, node: Node) {
    super(node)
    this.condition(this.path, new Unknown())
  }

  public lookup(path: string): Type {
    if (this.fields.hasOwnProperty(path)) {
      return this.fields[path]
    } else {
      return this.parent.lookup(path)
    }
  }

  public propogate(path: string, typ: Type) {
    if (this.fields.hasOwnProperty(path)) {
      const original = this.fields[path]
      const combined = original.union(typ)
      this.fields[path] = combined
      this.parent.propogate(path, new Opt(combined))
    } else {
      this.parent.propogate(path, typ)
    }
  }

  public toString(name?: string) {
    return super.toString(name || 'cond')
  }
}

export class With extends Scope {
  constructor(public parent: Scope, public path: string, node: Node) {
    super(node)
  }

  public lookup(path: string): Type {
    if (this.fields.hasOwnProperty(path)) {
      return this.fields[path]
    } else {
      return this.parent.lookup(path)
    }
  }

  public propogate(path: string, typ: Type) {
    if (this.fields.hasOwnProperty(path)) {
      const original = this.fields[path]
      const combined = original.union(typ)
      this.fields[path] = combined
      this.parent.propogate(path, new Obj({ [path]: combined }))
    } else {
      this.parent.propogate(path, new Obj({ [path]: typ }))
    }
  }

  public toString(name?: string) {
    return super.toString(name || 'with')
  }
}

export class Loop extends With {
  constructor(parent: Scope, path: string, node: Node) {
    super(parent, path, node)
    parent.condition(path, new List())
  }

  public propogate(path: string, typ: Type) {
    if (this.fields.hasOwnProperty(path)) {
      const original = this.fields[path]
      const combined = original.union(typ)
      this.fields[path] = combined
      this.parent.propogate(this.path, new List(new Obj({ [path]: typ })))
    } else {
      this.parent.propogate(this.path, new List(new Obj({ [path]: typ })))
    }
  }

  public toString() {
    return super.toString('loop')
  }
}
