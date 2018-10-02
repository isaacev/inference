import { Token, TokenType } from './lexer'

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
  public abstract toJSON(): { typ: string }
}

export class Root extends Node {
  constructor(public children: Node[]) {
    super()
  }

  public toJSON() {
    return {
      typ: 'root',
      children: this.children.map(child => child.toJSON()),
    }
  }
}

export class Text extends Node {
  constructor(public contents: string) {
    super()
  }

  public toJSON() {
    return {
      typ: 'text',
      contents: this.contents,
    }
  }
}

export class InlineAction extends Node {
  constructor(public field: string) {
    super()
  }

  public toJSON() {
    return {
      typ: 'inline',
      field: this.field,
    }
  }
}

export class BlockAction extends Node {
  constructor(
    public name: string,
    public field: string,
    public children: Node[]
  ) {
    super()
  }

  public toJSON() {
    return {
      typ: 'block',
      name: this.name,
      field: this.field,
      children: this.children.map(child => child.toJSON()),
    }
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
    return [cur.advance(), new Text(cur.read().val)]
  } else {
    return unexpectedToken(cur, TokenType.Text)
  }
}

const parseAction = (cur: TokenCursor): [TokenCursor, Node] => {
  const [cur1] = cur.require(TokenType.LeftDelim)
  switch (cur1.read().typ) {
    case TokenType.Field:
      return parseInlineAction(cur1)
    case TokenType.BlockStart:
      return parseBlockAction(cur1)
    default:
      return unexpectedToken(cur1)
  }
}

const parseInlineAction = (cur: TokenCursor): [TokenCursor, Node] => {
  const [cur1, field] = cur.require(TokenType.Field)
  const [cur2] = cur1.require(TokenType.RightDelim)
  return [cur2, new InlineAction(field.val)]
}

const parseBlockAction = (cur: TokenCursor): [TokenCursor, Node] => {
  const [cur1, start] = cur.require(TokenType.BlockStart)
  const [cur2, field] = cur1.require(TokenType.Field)
  let [cur3] = cur2.require(TokenType.RightDelim)

  const children = [] as Node[]
  while (true) {
    if (cur3.isDone() || cur.read().typ === TokenType.EOF) {
      return unexpectedToken(cur3)
    }

    if (
      cur3.read().typ === TokenType.LeftDelim &&
      cur3.advance().read().typ === TokenType.BlockEnd
    ) {
      const [cur4] = cur3.require(TokenType.LeftDelim)
      const [cur5] = cur4.require(TokenType.BlockEnd, start.val)
      const [cur6] = cur5.require(TokenType.RightDelim)
      return [cur6, new BlockAction(start.val, field.val, children)]
    }

    const [cur4, node] = parseAny(cur3)
    cur3 = cur4
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
