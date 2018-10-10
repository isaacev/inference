import { Token, TokenType, Point, Range } from './lexer'
import { Path } from './paths'

class TokenCursor {
  constructor(private domain: Token[], private pointer: number = 0) {}

  public isDone(): boolean {
    return this.pointer >= this.domain.length
  }

  public read(): Token {
    if (this.isDone()) {
      return this.domain[this.pointer - 1]
    } else {
      return this.domain[this.pointer]
    }
  }

  public advance(): TokenCursor {
    if (this.isDone()) {
      return this
    } else {
      return new TokenCursor(this.domain, this.pointer + 1)
    }
  }

  public require(typ: TokenType, val?: string): [TokenCursor, Token] {
    if (val) {
      if (this.read().typ === typ && this.read().val == val) {
        return [this.advance(), this.read()]
      } else {
        return unexpectedToken(this, typ, val)
      }
    } else if (this.read().typ === typ) {
      return [this.advance(), this.read()]
    } else {
      return unexpectedToken(this, typ)
    }
  }
}

export abstract class Node {
  public abstract start(): Point
  public abstract end(): Point
  public abstract toJSON(): { typ: string; range: Range }
}

export class Root extends Node {
  constructor(public children: Node[]) {
    super()
  }

  public start() {
    if (this.children.length > 0) {
      return this.children[0].start()
    } else {
      return { line: 1, column: 1 }
    }
  }

  public end() {
    if (this.children.length > 0) {
      return this.children[this.children.length - 1].end()
    } else {
      return { line: 1, column: 1 }
    }
  }

  public toJSON() {
    return {
      typ: 'root',
      range: this.range,
      children: this.children.map(child => child.toJSON()),
    }
  }
}

export class Text extends Node {
  constructor(public range: Range, public contents: string) {
    super()
  }

  public start() {
    return this.range[0]
  }

  public end() {
    return this.range[1]
  }

  public toJSON() {
    return {
      typ: 'text',
      range: this.range,
      contents: this.contents,
    }
  }
}

export class InlineAction extends Node {
  constructor(public range: Range, public expr: Expression) {
    super()
  }

  public start() {
    return this.range[0]
  }

  public end() {
    return this.range[1]
  }

  public toJSON() {
    return {
      typ: 'inline',
      range: this.range,
      expr: this.expr,
    }
  }
}

export class BlockAction extends Node {
  constructor(
    public range: Range,
    public name: string,
    public field: string,
    public children: Node[]
  ) {
    super()
  }

  public start() {
    return this.range[0]
  }

  public end() {
    return this.range[1]
  }

  public toJSON() {
    return {
      typ: 'block',
      range: this.range,
      name: this.name,
      field: this.field,
      children: this.children.map(child => child.toJSON()),
    }
  }
}

export abstract class Expression {
  public abstract start(): Point
  public abstract end(): Point
  public abstract toJSON(): { typ: string }
  public abstract toString(): string
}

export class FuncExpression extends Expression {
  constructor(public range: Range, public name: string, public field: Field) {
    super()
  }

  public start() {
    return this.range[0]
  }

  public end() {
    return this.range[1]
  }

  public toJSON() {
    return {
      typ: 'func',
      range: this.range,
      name: this.name,
      field: this.field,
    }
  }

  public toString() {
    return `(${this.name} ${this.field})`
  }
}

export class Str extends Expression {
  constructor(public range: Range, public value: string) {
    super()
  }

  public start() {
    return this.range[0]
  }

  public end() {
    return this.range[1]
  }

  public toJSON() {
    return {
      typ: 'str',
      range: this.range,
      value: this.value,
    }
  }

  public toString() {
    return `"${this.value}`
  }
}

export class Int extends Expression {
  constructor(public range: Range, public value: number) {
    super()
  }

  public start() {
    return this.range[0]
  }

  public end() {
    return this.range[1]
  }

  public toJSON() {
    return {
      typ: 'int',
      range: this.range,
      value: this.value,
    }
  }

  public toString() {
    return this.value.toString()
  }
}

export class Field extends Expression {
  public path: Path

  constructor(public range: Range, path: string) {
    super()
    this.path = Path.fromString(path)
  }

  public start() {
    return this.range[0]
  }

  public end() {
    return this.range[1]
  }

  public toJSON() {
    return {
      typ: 'field',
      range: this.range,
      path: this.path,
    }
  }

  public toString() {
    return this.path.toString()
  }
}

const unexpectedToken = (
  cur: TokenCursor,
  wanted?: TokenType,
  msg?: string
): never => {
  if (cur.read().typ === TokenType.Error) {
    throw new Error(cur.read().val)
  } else if (wanted && msg) {
    throw new Error(
      `wanted ${wanted}(${msg}), got ${cur.read().typ}(${cur.read().val})`
    )
  } else if (wanted) {
    throw new Error(`wanted ${wanted}, got ${cur.read().typ}`)
  } else {
    throw new Error(`unexpected ${cur.read().typ}`)
  }
}

const parseAny = (cur: TokenCursor): [TokenCursor, Node] => {
  switch (cur.read().typ) {
    case TokenType.Text:
      return parseText(cur)
    case TokenType.LeftDelim:
      return parseAction(cur)
    default:
      return unexpectedToken(cur)
  }
}

const parseText = (cur: TokenCursor): [TokenCursor, Text] => {
  if (cur.read().typ === TokenType.Text) {
    return [cur.advance(), new Text(cur.read().range, cur.read().val)]
  } else {
    return unexpectedToken(cur, TokenType.Text)
  }
}

const parseAction = (cur: TokenCursor): [TokenCursor, Node] => {
  const [cur1] = cur.require(TokenType.LeftDelim)
  switch (cur1.read().typ) {
    case TokenType.BlockStart:
      return parseBlockAction(cur)
    default:
      return parseInlineAction(cur)
  }
}

const parseExpression = (cur: TokenCursor): [TokenCursor, Node] => {
  switch (cur.read().typ) {
    case TokenType.Field:
      return [cur.advance(), new Field(cur.read().range, cur.read().val)]
    case TokenType.Str:
      return [cur.advance(), new Str(cur.read().range, cur.read().val)]
    case TokenType.Int:
      return [
        cur.advance(),
        new Int(cur.read().range, parseInt(cur.read().val, 10)),
      ]
    case TokenType.LeftParen:
      return parseFuncExpression(cur)
    default:
      return unexpectedToken(cur)
  }
}

const parseFuncExpression = (cur: TokenCursor): [TokenCursor, Expression] => {
  let [cur1, leftParen] = cur.require(TokenType.LeftParen)
  let [cur2, name] = cur1.require(TokenType.Name)
  // const exprs = [] as Expression[]
  // while (true) {
  //   if (cur1.isDone() || cur1.read().typ === TokenType.EOF) {
  //     return unexpectedToken(cur1, TokenType.RightParen)
  //   }

  //   if (cur1.read().typ === TokenType.RightParen) {
  //     const [cur2] = cur1.require(TokenType.RightParen)
  //     return [cur2, new FuncExpression(name.val, exprs)]
  //   }

  //   const [cur2, expr] = parseExpression(cur1)
  //   cur1 = cur2
  //   exprs.push(expr)
  // }

  let [cur3, field] = cur2.require(TokenType.Field)
  let [cur4, rightParen] = cur3.require(TokenType.RightParen)
  return [
    cur4,
    new FuncExpression(
      [leftParen.range[0], rightParen.range[1]],
      name.val,
      new Field(field.range, field.val)
    ),
  ]
}

const parseInlineAction = (cur: TokenCursor): [TokenCursor, Node] => {
  const [cur1, leftDelim] = cur.require(TokenType.LeftDelim)
  const [cur2, expr] = parseExpression(cur1)
  const [cur3, rightDelim] = cur2.require(TokenType.RightDelim)
  return [
    cur3,
    new InlineAction([leftDelim.range[0], rightDelim.range[1]], expr),
  ]
}

const parseBlockAction = (cur: TokenCursor): [TokenCursor, Node] => {
  const [cur1, leftDelim] = cur.require(TokenType.LeftDelim)
  const [cur2, start] = cur1.require(TokenType.BlockStart)
  const [cur3, field] = cur2.require(TokenType.Field)
  let [cur4] = cur3.require(TokenType.RightDelim)

  const children = [] as Node[]
  while (true) {
    if (cur4.isDone() || cur.read().typ === TokenType.EOF) {
      return unexpectedToken(cur4)
    }

    if (
      cur4.read().typ === TokenType.LeftDelim &&
      cur4.advance().read().typ === TokenType.BlockEnd
    ) {
      const [cur5] = cur4.require(TokenType.LeftDelim)
      const [cur6] = cur5.require(TokenType.BlockEnd, start.val)
      const [cur7, rightDelim] = cur6.require(TokenType.RightDelim)
      return [
        cur7,
        new BlockAction(
          [leftDelim.range[0], rightDelim.range[1]],
          start.val,
          field.val,
          children
        ),
      ]
    }

    const [cur5, node] = parseAny(cur4)
    cur4 = cur5
    children.push(node)
  }
}

export const toTree = (toks: Token[]): Root => {
  let cur = new TokenCursor(toks)
  const children = [] as Node[]
  while (cur.isDone() === false && cur.read().typ !== TokenType.EOF) {
    const [cur1, node] = parseAny(cur)
    cur = cur1
    children.push(node)
  }
  return new Root(children)
}
