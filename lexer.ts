import { TemplateSyntaxError } from './errors'

const LOWER_LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const UPPER_LETTERS = LOWER_LETTERS.toUpperCase()
const LETTERS = LOWER_LETTERS + UPPER_LETTERS
const NUMBERS = '0123456789'
const ALPHANUMERIC = LETTERS + NUMBERS + '-_'

export type Point = { line: number; column: number }

export type Range = [Point, Point]

class Cursor {
  constructor(
    private domain: string,
    private pointer: number = 0,
    private line: number = 1,
    private column: number = 1
  ) {}

  public isDone(): boolean {
    return this.pointer >= this.domain.length
  }

  public read(): string {
    if (this.isDone()) {
      return ''
    } else {
      return this.domain[this.pointer]
    }
  }

  public position(): Point {
    return { line: this.line, column: this.column }
  }

  public advance(): Cursor {
    if (this.isDone()) {
      return this
    } else if (this.read() === '\n') {
      return new Cursor(this.domain, this.pointer + 1, this.line + 1, 1)
    } else {
      return new Cursor(
        this.domain,
        this.pointer + 1,
        this.line,
        this.column + 1
      )
    }
  }

  public accepts(valid: string): boolean {
    if (this.isDone()) {
      return false
    } else if (valid.indexOf(this.read()) > -1) {
      return true
    } else {
      return false
    }
  }

  public hasPrefix(pre: string): boolean {
    if (pre.length === 0) {
      return true
    } else if (this.read() !== pre[0]) {
      return false
    } else {
      return this.advance().hasPrefix(pre.slice(1))
    }
  }

  public skipPrefix(pre: string, abort: Cursor = this): Cursor {
    if (pre.length === 0) {
      return this
    } else if (this.read() !== pre[0]) {
      return abort
    } else {
      return this.advance().skipPrefix(pre.slice(1), this)
    }
  }

  public skipWhitespace(): Cursor {
    let cur: Cursor = this
    while (!cur.isDone() && /\s/.test(cur.read())) {
      cur = cur.advance()
    }
    return cur
  }
}

const LEFT_DELIM = '{{'
const RIGHT_DELIM = '}}'

export enum TokenType {
  EOF = 'EOF',
  LeftDelim = 'LEFT_DELIM',
  BlockStart = 'BLOCK_START',
  BlockEnd = 'BLOCK_END',
  Field = 'FIELD',
  Name = 'NAME',
  Int = 'INT',
  Str = 'STR',
  Equal = 'EQUAL',
  LeftParen = 'LEFT_PAREN',
  RightParen = 'RIGHT_PAREN',
  RightDelim = 'RIGHT_DELIM',
  Text = 'TEXT',
}

export class Token {
  constructor(public typ: TokenType, public val: string, public range: Range) {}

  public toString() {
    const typ = this.typ.toString()
    const val = (this.val.length > 5 ? this.val.slice(0, 5) + '...' : this.val)
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
    return `[ ${typ} "${val}" ]`
  }

  public toJSON() {
    return {
      typ: this.typ.toString(),
      val: this.val,
      range: this.range,
    }
  }
}

type LexFn = (cur: Cursor, toks: Token[]) => [Cursor, LexFn | null]

const lexAny: LexFn = (cur, toks) => {
  if (cur.isDone()) {
    toks.push(new Token(TokenType.EOF, '', [cur.position(), cur.position()]))
    return [cur, null]
  } else if (cur.hasPrefix(LEFT_DELIM)) {
    return [cur, lexLeftDelim]
  } else {
    return [cur, lexText]
  }
}

const lexText: LexFn = (cur, toks) => {
  let val = ''
  const start = cur.position()
  while (!cur.isDone() && !cur.hasPrefix(LEFT_DELIM)) {
    val += cur.read()
    cur = cur.advance()
  }
  toks.push(new Token(TokenType.Text, val, [start, cur.position()]))
  return [cur, lexAny]
}

const lexLeftDelim: LexFn = (cur, toks) => {
  if (cur.hasPrefix(LEFT_DELIM)) {
    toks.push(
      new Token(TokenType.LeftDelim, LEFT_DELIM, [
        cur.position(),
        cur.skipPrefix(LEFT_DELIM).position(),
      ])
    )
    return [cur.skipPrefix(LEFT_DELIM), lexInside]
  } else {
    throw new TemplateSyntaxError([cur.position(), cur.position()], 'expected left delimiter')
  }
}

const lexInside: LexFn = (cur, _toks) => {
  cur = cur.skipWhitespace()

  if (cur.isDone()) {
    return [cur, lexRightDelim]
  }

  if (cur.hasPrefix(RIGHT_DELIM)) {
    return [cur, lexRightDelim]
  }

  switch (cur.read()) {
    case '#':
      return [cur.advance(), lexBlockStart]
    case '/':
      return [cur, lexBlockEnd]
    case '.':
      return [cur, lexField]
    case '=':
      return [cur, lexEqual]
    case '(':
      return [cur, lexLeftParen]
    case ')':
      return [cur, lexRightParen]
    case '"':
      return [cur, lexStr]
    default:
      if (cur.accepts(NUMBERS)) {
        return [cur, lexInt]
      } else if (cur.accepts(ALPHANUMERIC)) {
        return [cur, lexName]
      } else {
        throw new TemplateSyntaxError([cur.position(), cur.position()], 'unexpected character')
      }
  }
}

const makeLexerForChar = (val: string, typ: TokenType): LexFn => {
  return (cur, toks) => {
    if (cur.read() !== val) {
      throw new TemplateSyntaxError([cur.position(), cur.position()], `expected "${val}", found "${cur.read()}"`)
    } else {
      toks.push(new Token(typ, val, [cur.position(), cur.advance().position()]))
      return [cur.advance(), lexInside]
    }
  }
}

const lexEqual = makeLexerForChar('=', TokenType.Equal)
const lexLeftParen = makeLexerForChar('(', TokenType.LeftParen)
const lexRightParen = makeLexerForChar(')', TokenType.RightParen)

const lexStr: LexFn = (cur, toks) => {
  let val = ''
  let esc = false
  const start = cur.position()
  cur = cur.advance()
  while (!cur.isDone() && cur.read() !== '\n') {
    if (cur.read() === '\\') {
      esc = true
      cur = cur.advance()
      continue
    } else if (cur.read() === '"') {
      if (esc) {
        val += '"'
        cur = cur.advance()
        esc = false
      } else {
        toks.push(
          new Token(TokenType.Str, val, [start, cur.advance().position()])
        )
        return [cur.advance(), lexInside]
      }
    } else {
      val += cur.read()
      cur = cur.advance()
    }
  }
  throw new TemplateSyntaxError([start, cur.position()], 'unclosed string')
}

const lexInt: LexFn = (cur, toks) => {
  let val = ''
  const start = cur.position()
  while (!cur.isDone() && cur.accepts(NUMBERS)) {
    val += cur.read()
    cur = cur.advance()
  }
  toks.push(new Token(TokenType.Int, val, [start, cur.position()]))
  return [cur, lexInside]
}

const lexName: LexFn = (cur, toks) => {
  let val = ''
  const start = cur.position()
  while (!cur.isDone() && cur.accepts(ALPHANUMERIC)) {
    val += cur.read()
    cur = cur.advance()
  }
  toks.push(new Token(TokenType.Name, val, [start, cur.position()]))
  return [cur, lexInside]
}

const lexField: LexFn = (cur, toks) => {
  let val = ''
  const start = cur.position()
  while (!cur.isDone() && cur.accepts('.')) {
    val += cur.read()
    cur = cur.advance()
    while (!cur.isDone() && cur.accepts(ALPHANUMERIC)) {
      val += cur.read()
      cur = cur.advance()
    }
  }

  if (val.match(/^(\.|(\.\w+)+)$/)) {
    toks.push(new Token(TokenType.Field, val, [start, cur.position()]))
    return [cur, lexInside]
  } else {
    throw new TemplateSyntaxError([start, cur.position()], 'illegal field')
  }
}

const lexBlockStart: LexFn = (cur, toks) => {
  let val = ''
  const start = cur.position()
  while (!cur.isDone() && cur.accepts(ALPHANUMERIC)) {
    val += cur.read()
    cur = cur.advance()
  }
  if (val.length === 0) {
    throw new TemplateSyntaxError([start, cur.position()], 'expected block name')
  }
  toks.push(new Token(TokenType.BlockStart, val, [start, cur.position()]))
  return [cur, lexInside]
}

const lexBlockEnd: LexFn = (cur, toks) => {
  let val = ''
  const start = cur.position()
  cur = cur.advance()
  while (!cur.isDone() && cur.accepts(ALPHANUMERIC)) {
    val += cur.read()
    cur = cur.advance()
  }
  toks.push(new Token(TokenType.BlockEnd, val, [start, cur.position()]))
  return [cur, lexRightDelim]
}

const lexRightDelim: LexFn = (cur, toks) => {
  cur = cur.skipWhitespace()
  if (cur.hasPrefix(RIGHT_DELIM)) {
    toks.push(
      new Token(TokenType.RightDelim, RIGHT_DELIM, [
        cur.position(),
        cur.skipPrefix(RIGHT_DELIM).position(),
      ])
    )
    return [cur.skipPrefix(RIGHT_DELIM), lexAny]
  } else {
    throw new TemplateSyntaxError([cur.position(), cur.position()], 'expected right delimiter')
  }
}

export const toTokens = (tmpl: string): Token[] => {
  const toks = [] as Token[]
  let cur = new Cursor(tmpl)
  let fn: LexFn | null = lexAny
  while (fn !== null) {
    ;[cur, fn] = fn(cur, toks)
  }
  return toks
}
