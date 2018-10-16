import * as paths from './paths'
import * as tmpl from './grammar'
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

  export const infer = (root: ast.Root): Root => {
    const scope = new Root(root, new types.Unknown())
    root.children.forEach(node => nodeToScope(scope, node))
    return scope
  }

  const nodeToScope = (scope: Scope, node: ast.Node) => {
    if (node instanceof ast.InlineAction) {
      exprToScope(scope, node.expr)
    } else if (node instanceof ast.BlockAction) {
      throw new TemplateSyntaxError(node.range, `unknown block`)
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
