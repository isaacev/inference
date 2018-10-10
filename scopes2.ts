import { Type, Unknown, Opt, Nil, List, Str } from './types'
import * as parser from './parser'
import { Path, lookup, smallestCommonType, largestCommonType } from './paths'
import { TemplateSyntaxError } from './errors'

export abstract class Scope {
  public children: Scope[]

  constructor(public node: parser.Node, public context: Type) {
    this.children = []
  }

  public lookup(path: Path): Type {
    return lookup(path, this.context)
  }

  public abstract constrain(path: Path, typ: Type): void

  public abstract propogate(path: Path, typ: Type): void

  public toString(): string {
    return this.context.toString()
  }
}

export class Root extends Scope {
  public constrain(path: Path, typ: Type) {
    this.context = smallestCommonType(path, this.context, typ)
  }

  public propogate(path: Path, typ: Type) {
    this.context = largestCommonType(path, this.context, typ)
  }
}

export abstract class ChildScope extends Scope {
  constructor(public parent: Scope, public path: Path, node: parser.Node, context?: Type) {
    super(node, context ? context : parent.lookup(path))
    this.parent.children.push(this)
  }
}

export class Cond extends ChildScope {
  constructor(parent: Scope, path: Path, node: parser.Node, context: Type = parent.lookup(path)) {
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

  public constrain(path: Path, typ: Type) {
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

  public propogate(path: Path, typ: Type) {
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
  constructor(parent: Scope, path: Path, node: parser.Node, context?: Type) {
    super(parent, path, node, context)
    this.parent.constrain(this.path, new Unknown())
  }

  public constrain(path: Path, typ: Type) {
    this.context = smallestCommonType(path, this.context, typ)
    this.parent.constrain(this.path, this.context)
  }

  public propogate(path: Path, typ: Type) {
    this.context = largestCommonType(path, this.context, typ)
    this.parent.constrain(this.path, this.context)
  }
}

export class Loop extends ChildScope {
  constructor(parent: Scope, path: Path, node: parser.Node, context?: Type) {
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

  public constrain(path: Path, typ: Type) {
    this.context = smallestCommonType(path, this.context, typ)
    this.parent.propogate(this.path, new List(this.context))
  }

  public propogate(path: Path, typ: Type) {
    this.context = largestCommonType(path, this.context, typ)
    this.parent.propogate(this.path, new List(this.context))
  }
}

export const toScope = (root: parser.Root): Root => {
  const scope = new Root(root, new Unknown())
  root.children.forEach(node => nodeToScope(scope, node))
  return scope
}

const nodeToScope = (scope: Scope, node: parser.Node) => {
  if (node instanceof parser.InlineAction) {
    exprToScope(scope, node.expr)
  } else if (node instanceof parser.BlockAction) {
    if (node.name === 'cond') {
      const subscope = new Cond(scope, Path.fromString(node.field), node)
      node.children.forEach(subnode => nodeToScope(subscope, subnode))
    } else if (node.name === 'with') {
      const subscope = new With(scope, Path.fromString(node.field), node)
      node.children.forEach(subnode => nodeToScope(subscope, subnode))
    } else if (node.name === 'loop') {
      const subscope = new Loop(scope, Path.fromString(node.field), node)
      node.children.forEach(subnode => nodeToScope(subscope, subnode))
    } else {
      throw new TemplateSyntaxError([node.start(), node.end()], `unknown block`)
    }
  }
}

const exprToScope = (scope: Scope, expr: parser.Expression) => {
  if (expr instanceof parser.Field) {
    scope.constrain(expr.path, new Str())
  } else {
    throw new TemplateSyntaxError([expr.start(), expr.end()], `unknown expression`)
  }
}
