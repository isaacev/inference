import { TemplateSyntaxError } from './errors'

export class Point {
  public static fromPosition(pos: { line: number; ch: number }): Point {
    return new Point(pos.line + 1, pos.ch + 1)
  }

  constructor(public line: number, public column: number) {}

  public before(pt: Point): boolean {
    if (this.line > pt.line) {
      return false
    } else if (this.line === pt.line) {
      return this.column < pt.column
    } else {
      return true
    }
  }

  public equals(pt: Point): boolean {
    return this.line === pt.line && this.column === pt.column
  }

  public after(pt: Point): boolean {
    if (this.line < pt.line) {
      return false
    } else if (this.line === pt.line) {
      return this.column > pt.column
    } else {
      return true
    }
  }

  public toPosition() {
    return {
      line: this.line - 1,
      ch: this.column - 1,
    }
  }

  public toJSON() {
    return {
      line: this.line,
      column: this.column,
    }
  }

  public toString(): string {
    return `(${this.line}:${this.column})`
  }
}

export class Range {
  constructor(public left: Point, public right: Point = left) {}

  public toJSON() {
    return {
      left: this.left,
      right: this.right,
    }
  }

  public toString(): string {
    if (this.left.equals(this.right)) {
      return `at ${this.left}`
    } else {
      return `from ${this.left} to ${this.right}`
    }
  }
}

export namespace paths {
  export abstract class Segment {
    public abstract equalTo(other: Segment): boolean
    public abstract toString(): string
  }

  export class Field extends Segment {
    constructor(public name: string) {
      super()
    }

    public equalTo(other: Segment): boolean {
      return other instanceof Field && other.name === this.name
    }

    public toJSON() {
      return {
        typ: 'field',
        name: this.name,
      }
    }

    public toString() {
      return '.' + this.name
    }
  }

  export class Index extends Segment {
    public equalTo(other: Segment) {
      return other instanceof Index
    }

    public toString() {
      return '[]'
    }

    public toJSON() {
      return {
        typ: 'index',
      }
    }
  }

  export class Path {
    public static fromString(path: string): Path {
      if (path === '.') {
        return new Path()
      } else if (/^(\.[a-z]+)+$/i.test(path)) {
        return new Path(
          path
            .split('.')
            .slice(1)
            .map(f => new Field(f))
        )
      } else {
        throw new Error(`illegal path: "${path}"`)
      }
    }

    public static fromFields(fields: string[]): Path {
      if (fields.length === 0) {
        return new Path()
      } else {
        return new Path(fields.map(f => new Field(f.replace(/^\./, ''))))
      }
    }

    constructor(private segments: Segment[] = []) {}

    public length(): number {
      return this.segments.length
    }

    public head(): Segment | null {
      if (this.length() === 0) {
        return null
      } else {
        return this.segments[0]
      }
    }

    public rest(): Path {
      return new Path(this.segments.slice(1))
    }

    public hasHead(path: Path): boolean {
      if (path.length() > this.length()) {
        return false
      } else {
        return path.segments.every((seg, i) => seg.equalTo(this.segments[i]))
      }
    }

    public relativeTo(path: Path): Path {
      if (this.hasHead(path)) {
        return new Path(this.segments.slice(path.length()))
      } else {
        return this
      }
    }

    public toString(): string {
      if (this.length() === 0) {
        return '.'
      } else {
        return this.segments.map(s => s.toString()).join('')
      }
    }
  }
}

namespace lexer {
  const LOWER_LETTERS = 'abcdefghijklmnopqrstuvwxyz'
  const UPPER_LETTERS = LOWER_LETTERS.toUpperCase()
  const LETTERS = LOWER_LETTERS + UPPER_LETTERS
  const NUMBERS = '0123456789'
  const ALPHANUMERIC = LETTERS + NUMBERS + '-_'
  const LEFT_DELIM = '{{'
  const RIGHT_DELIM = '}}'

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
      return new Point(this.line, this.column)
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

  export enum TokenType {
    EOF = 'EOF',
    LeftDelim = 'LEFT_DELIM',
    BlockStart = 'BLOCK_START',
    ClauseStart = 'CLAUSE_START',
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
    constructor(
      public typ: TokenType,
      public val: string,
      public range: Range
    ) {}

    public toString() {
      const typ = this.typ.toString()
      const val = (this.val.length > 5
        ? this.val.slice(0, 5) + '...'
        : this.val
      )
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
      toks.push(new Token(TokenType.EOF, '', new Range(cur.position())))
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
    toks.push(new Token(TokenType.Text, val, new Range(start, cur.position())))
    return [cur, lexAny]
  }

  const lexLeftDelim: LexFn = (cur, toks) => {
    if (cur.hasPrefix(LEFT_DELIM)) {
      toks.push(
        new Token(
          TokenType.LeftDelim,
          LEFT_DELIM,
          new Range(cur.position(), cur.skipPrefix(LEFT_DELIM).position())
        )
      )
      return [cur.skipPrefix(LEFT_DELIM), lexInside]
    } else {
      throw new TemplateSyntaxError(cur.position(), 'expected left delimiter')
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
      case ':':
        return [cur, lexClauseStart]
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
          throw new TemplateSyntaxError(cur.position(), 'unexpected character')
        }
    }
  }

  const makeLexerForChar = (val: string, typ: TokenType): LexFn => {
    return (cur, toks) => {
      if (cur.read() !== val) {
        throw new TemplateSyntaxError(
          cur.position(),
          `expected "${val}", found "${cur.read()}"`
        )
      } else {
        toks.push(
          new Token(
            typ,
            val,
            new Range(cur.position(), cur.advance().position())
          )
        )
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
            new Token(
              TokenType.Str,
              val,
              new Range(start, cur.advance().position())
            )
          )
          return [cur.advance(), lexInside]
        }
      } else {
        val += cur.read()
        cur = cur.advance()
      }
    }
    throw new TemplateSyntaxError(
      new Range(start, cur.position()),
      'unclosed string'
    )
  }

  const lexInt: LexFn = (cur, toks) => {
    let val = ''
    const start = cur.position()
    while (!cur.isDone() && cur.accepts(NUMBERS)) {
      val += cur.read()
      cur = cur.advance()
    }
    toks.push(new Token(TokenType.Int, val, new Range(start, cur.position())))
    return [cur, lexInside]
  }

  const lexName: LexFn = (cur, toks) => {
    let val = ''
    const start = cur.position()
    while (!cur.isDone() && cur.accepts(ALPHANUMERIC)) {
      val += cur.read()
      cur = cur.advance()
    }
    toks.push(new Token(TokenType.Name, val, new Range(start, cur.position())))
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
      toks.push(
        new Token(TokenType.Field, val, new Range(start, cur.position()))
      )
      return [cur, lexInside]
    } else {
      throw new TemplateSyntaxError(
        new Range(start, cur.position()),
        'illegal field'
      )
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
      throw new TemplateSyntaxError(
        new Range(start, cur.position()),
        'expected block name'
      )
    }
    toks.push(
      new Token(TokenType.BlockStart, val, new Range(start, cur.position()))
    )
    return [cur, lexInside]
  }

  const lexClauseStart: LexFn = (cur, toks) => {
    let val = ''
    const start = cur.position()
    cur = cur.advance() // Skip colon
    while (!cur.isDone() && cur.accepts(ALPHANUMERIC)) {
      val += cur.read()
      cur = cur.advance()
    }
    if (val.length === 0) {
      throw new TemplateSyntaxError(
        new Range(start, cur.position()),
        'expected clause name'
      )
    }
    toks.push(
      new Token(TokenType.ClauseStart, val, new Range(start, cur.position()))
    )
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
    toks.push(
      new Token(TokenType.BlockEnd, val, new Range(start, cur.position()))
    )
    return [cur, lexRightDelim]
  }

  const lexRightDelim: LexFn = (cur, toks) => {
    cur = cur.skipWhitespace()
    if (cur.hasPrefix(RIGHT_DELIM)) {
      toks.push(
        new Token(
          TokenType.RightDelim,
          RIGHT_DELIM,
          new Range(cur.position(), cur.skipPrefix(RIGHT_DELIM).position())
        )
      )
      return [cur.skipPrefix(RIGHT_DELIM), lexAny]
    } else {
      throw new TemplateSyntaxError(cur.position(), 'expected right delimiter')
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
}

export namespace ast {
  class TokenCursor {
    constructor(private domain: lexer.Token[], private pointer: number = 0) {}

    public isDone(): boolean {
      return this.pointer >= this.domain.length
    }

    public read(): lexer.Token {
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

    public require(typ: lexer.TokenType): [TokenCursor, lexer.Token] {
      if (this.read().typ === typ) {
        return [this.advance(), this.read()]
      } else {
        return unexpectedToken(this, typ)
      }
    }

    public requireAll(
      types: (lexer.TokenType | ((cur: TokenCursor) => true | never))[]
    ): [TokenCursor, lexer.Token[]] {
      let cur: TokenCursor = this
      let toks = [] as lexer.Token[]
      for (const typ of types) {
        if (typeof typ === 'function') {
          if (typ(cur)) {
            toks.push(cur.read())
            cur = cur.advance()
          }
        } else {
          const [after, tok] = cur.require(typ)
          cur = after
          toks.push(tok)
        }
      }
      return [cur, toks]
    }

    public requireClosingAction(val: string): [TokenCursor, lexer.Token] {
      if (
        this.read().typ === lexer.TokenType.BlockEnd &&
        this.read().val === val
      ) {
        return [this.advance(), this.read()]
      } else {
        throw new TemplateSyntaxError(
          this.read().range,
          `expected "/${val}", got "/${this.read().val}"`
        )
      }
    }
  }

  export abstract class Node {
    public abstract range: Range
    public abstract toJSON(): { typ: string; range: Range }
  }

  export class Root extends Node {
    public range: Range

    constructor(public children: Node[]) {
      super()
      this.range = new Range(
        this.children.length > 0
          ? this.children[0].range.left
          : new Point(1, 1),
        this.children.length > 0
          ? this.children[this.children.length - 1].range.right
          : new Point(1, 1)
      )
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
      public children: Node[],
      public clauses: Clause[]
    ) {
      super()
    }

    public toJSON() {
      return {
        typ: 'block',
        range: this.range,
        name: this.name,
        field: this.field,
        children: this.children.map(child => child.toJSON()),
        clauses: this.clauses,
      }
    }
  }

  interface Clause {
    range: Range
    name: string
    expr: Expression
    children: Node[]
  }

  export abstract class Expression {
    public abstract range: Range
    public abstract toJSON(): { typ: string }
    public abstract toString(): string
  }

  export class FuncExpression extends Expression {
    constructor(public range: Range, public name: string, public field: Field) {
      super()
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
    public path: paths.Path

    constructor(public range: Range, path: string) {
      super()
      this.path = paths.Path.fromString(path)
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
    wanted?: lexer.TokenType
  ): never => {
    const msg = wanted
      ? `wanted "${wanted}", got "${cur.read().typ}"`
      : `unexpected ${cur.read().typ}`
    throw new TemplateSyntaxError(cur.read().range, msg)
  }

  const parseAny = (cur: TokenCursor): [TokenCursor, Node] => {
    switch (cur.read().typ) {
      case lexer.TokenType.Text:
        return parseText(cur)
      case lexer.TokenType.LeftDelim:
        return parseAction(cur)
      default:
        return unexpectedToken(cur)
    }
  }

  const parseText = (cur: TokenCursor): [TokenCursor, Text] => {
    if (cur.read().typ === lexer.TokenType.Text) {
      return [cur.advance(), new Text(cur.read().range, cur.read().val)]
    } else {
      return unexpectedToken(cur, lexer.TokenType.Text)
    }
  }

  const parseAction = (cur: TokenCursor): [TokenCursor, Node] => {
    const [cur1] = cur.require(lexer.TokenType.LeftDelim)
    switch (cur1.read().typ) {
      case lexer.TokenType.BlockStart:
        return parseBlockAction(cur)
      default:
        return parseInlineAction(cur)
    }
  }

  const parseExpression = (cur: TokenCursor): [TokenCursor, Expression] => {
    switch (cur.read().typ) {
      case lexer.TokenType.Field:
        return [cur.advance(), new Field(cur.read().range, cur.read().val)]
      case lexer.TokenType.Str:
        return [cur.advance(), new Str(cur.read().range, cur.read().val)]
      case lexer.TokenType.Int:
        return [
          cur.advance(),
          new Int(cur.read().range, parseInt(cur.read().val, 10)),
        ]
      case lexer.TokenType.LeftParen:
        return parseFuncExpression(cur)
      default:
        return unexpectedToken(cur)
    }
  }

  const parseFuncExpression = (cur: TokenCursor): [TokenCursor, Expression] => {
    let [cur1, leftParen] = cur.require(lexer.TokenType.LeftParen)
    let [cur2, name] = cur1.require(lexer.TokenType.Name)
    let [cur3, field] = cur2.require(lexer.TokenType.Field)
    let [cur4, rightParen] = cur3.require(lexer.TokenType.RightParen)
    return [
      cur4,
      new FuncExpression(
        new Range(leftParen.range.left, rightParen.range.right),
        name.val,
        new Field(field.range, field.val)
      ),
    ]
  }

  const parseInlineAction = (cur: TokenCursor): [TokenCursor, Node] => {
    const [cur1, leftDelim] = cur.require(lexer.TokenType.LeftDelim)
    const [cur2, expr] = parseExpression(cur1)
    const [cur3, rightDelim] = cur2.require(lexer.TokenType.RightDelim)
    return [
      cur3,
      new InlineAction(
        new Range(leftDelim.range.left, rightDelim.range.right),
        expr
      ),
    ]
  }

  const parseBlockAction = (cur: TokenCursor): [TokenCursor, Node] => {
    // Block opening.
    const [afterOpening, [leftDelim, start, field]] = cur.requireAll([
      lexer.TokenType.LeftDelim,
      lexer.TokenType.BlockStart,
      lexer.TokenType.Field,
      lexer.TokenType.RightDelim,
    ])

    // Implicit clause.
    const [afterImplicit, children] = parseNodeSeries(afterOpening)

    // Any additional clauses.
    cur = afterImplicit
    const clauses = [] as Clause[]
    while (hasMoreClauses(cur)) {
      const [beforeExpr, [leftDelim, start]] = cur.requireAll([
        lexer.TokenType.LeftDelim,
        lexer.TokenType.ClauseStart,
      ])

      const [afterExpr, expr] = parseExpression(beforeExpr)
      const [afterOpening] = afterExpr.require(lexer.TokenType.RightDelim)
      const [afterClause, children] = parseNodeSeries(afterOpening)

      clauses.push({
        range: new Range(leftDelim.range.left, afterClause.read().range.left),
        name: start.val,
        expr: expr,
        children,
      })
      cur = afterClause
    }

    // Block closing.
    const [afterBlock, [, , rightDelim]] = cur.requireAll([
      lexer.TokenType.LeftDelim,
      cur => (cur.requireClosingAction(start.val), true),
      lexer.TokenType.RightDelim,
    ])

    return [
      afterBlock,
      new BlockAction(
        new Range(leftDelim.range.left, rightDelim.range.right),
        start.val,
        field.val,
        children,
        clauses
      ),
    ]
  }

  const parseNodeSeries = (cur: TokenCursor): [TokenCursor, Node[]] => {
    const nodes = [] as Node[]
    while (true) {
      if (cur.isDone() || cur.read().typ === lexer.TokenType.EOF) {
        return [cur, nodes]
      } else if (cur.read().typ === lexer.TokenType.LeftDelim) {
        if (
          cur.advance().read().typ === lexer.TokenType.BlockEnd ||
          cur.advance().read().typ === lexer.TokenType.ClauseStart
        ) {
          return [cur, nodes]
        }
      }

      const [after, node] = parseAny(cur)
      cur = after
      nodes.push(node)
    }
  }

  const hasMoreClauses = (cur: TokenCursor): boolean => {
    return (
      cur.read().typ === lexer.TokenType.LeftDelim &&
      cur.advance().read().typ === lexer.TokenType.ClauseStart
    )
  }

  export const toTree = (toks: lexer.Token[]): Root => {
    let cur = new TokenCursor(toks)
    const children = [] as Node[]
    while (cur.isDone() === false && cur.read().typ !== lexer.TokenType.EOF) {
      const [cur1, node] = parseAny(cur)
      cur = cur1
      children.push(node)
    }
    return new Root(children)
  }

  export const parse = (tmpl: string): Root => {
    const toks = lexer.toTokens(tmpl)
    let cur = new TokenCursor(toks)
    const children = [] as Node[]
    while (cur.isDone() === false && cur.read().typ !== lexer.TokenType.EOF) {
      const [cur1, node] = parseAny(cur)
      cur = cur1
      children.push(node)
    }
    return new Root(children)
  }
}
