import { Point, paths, ast } from './syntax'
import { TemplateSyntaxError } from './errors'

export namespace types {
}

export namespace scope {
  export abstract class Scope {
    public children: Scope[]

    constructor(public node: ast.Node, public context: types.Type) {
      this.children = []
    }

    public lookup(path: paths.Path): types.Type {
      return types.lookup(path, this.context)
    }

    public abstract constrain(path: paths.Path, typ: types.Type): void

    public abstract propogate(path: paths.Path, typ: types.Type): void

    public toString(): string {
      return this.context.toString()
    }
  }

  export class Root extends Scope {
    public constrain(path: paths.Path, typ: types.Type) {
      this.context = types.smallestCommonType(path, this.context, typ)
    }

    public propogate(path: paths.Path, typ: types.Type) {
      this.context = types.largestCommonType(path, this.context, typ)
    }
  }

  export abstract class ChildScope extends Scope {
    constructor(
      public parent: Scope,
      public path: paths.Path,
      node: ast.Node,
      context?: types.Type
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
      context: types.Type = parent.lookup(path)
    ) {
      if (context instanceof types.Unknown) {
        super(parent, path, node, new types.Unknown())
        this.parent.constrain(this.path, new types.Opt())
      } else if (context instanceof types.Opt) {
        super(parent, path, node, context.child)
      } else if (context instanceof types.Nil) {
        super(parent, path, node, context)
        // console.warn('conditional will never be triggered')
      } else {
        super(parent, path, node, context)
        // console.warn('conditional is not necessary')
      }
    }

    public constrain(path: paths.Path, typ: types.Type) {
      if (path.hasHead(this.path)) {
        // Constraint directly affect the conditional block.
        const relpath = path.relativeTo(this.path)
        this.context = types.smallestCommonType(relpath, this.context, typ)
        this.parent.propogate(this.path, new types.Opt(this.context))
      } else {
        // Constraint directly impacts parent scope.
        this.parent.constrain(path, typ)
      }
    }

    public propogate(path: paths.Path, typ: types.Type) {
      if (path.hasHead(this.path)) {
        // Constraint directly affect the conditional block.
        const relpath = path.relativeTo(this.path)
        this.context = types.largestCommonType(relpath, this.context, typ)
        this.parent.propogate(this.path, new types.Opt(this.context))
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
      context?: types.Type
    ) {
      super(parent, path, node, context)
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
  }

  export class Loop extends ChildScope {
    constructor(
      parent: Scope,
      path: paths.Path,
      node: ast.Node,
      context?: types.Type
    ) {
      if (context instanceof types.Unknown) {
        super(parent, path, node, new types.Unknown())
        this.parent.constrain(this.path, new types.List())
      } else if (context instanceof types.List) {
        super(parent, path, node, context.child)
      } else {
        // This branch should throw an error.
        super(parent, path, node, context)
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
  }

  export const infer = (root: ast.Root): Root => {
    const scope = new Root(root, new types.Unknown())
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
      scope.constrain(expr.path, new types.Str())
    } else {
      throw new TemplateSyntaxError(expr.range, `unknown expression`)
    }
  }
}
