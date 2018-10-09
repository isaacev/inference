import * as parser from './parser'
import { Type, Str } from './types'
import { Scope, Root, Cond, With, Loop } from './scopes'

type NewableScope = { new (parent: Scope, path: string): Scope }

const blockScopes: { [name: string]: NewableScope } = {
  cond: Cond,
  with: With,
  loop: Loop,
}

export const toConstraints = (root: parser.Root): Root => {
  const scope = new Root()
  root.children.forEach(node => constrainNode(scope, node))
  return scope
}

const constrainNode = (scope: Scope, node: parser.Node) => {
  if (node instanceof parser.Text) {
    return
  } else if (node instanceof parser.InlineAction) {
    constrainExpr(scope, node.expr, new Str())
  } else if (node instanceof parser.BlockAction) {
    const constructor = blockScopes[node.name] as NewableScope | undefined
    if (!constructor) {
      throw new Error(`unknown block: "${node.name}"`)
    }

    const subscope = new constructor(scope, node.field)
    node.children.forEach(node => constrainNode(subscope, node))
  } else {
    throw new Error(`unknown node: "${node.toJSON().typ}"`)
  }
}

const constrainExpr = (scope: Scope, expr: parser.Expression, typ: Type) => {
  if (expr instanceof parser.Field) {
    scope.constrain(expr.path, typ)
  } else {
    throw new Error(`unknown expression: "${expr.toJSON().typ}"`)
  }
}
