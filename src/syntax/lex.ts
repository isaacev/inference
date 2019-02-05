import { Point, Span } from '~/syntax'

export enum TokenName {
  Dollar = 'Dollar',
  Dot = 'Dot',
  EOF = 'EOF',
  Error = 'Error',
  Hash = 'Hash',
  Integer = 'Integer',
  LeftBracket = 'LeftBracket',
  LeftMeta = 'LeftMeta',
  RightAngle = 'RightAngle',
  RightBracket = 'RightBracket',
  RightMeta = 'RightMeta',
  Slash = 'Slash',
  Spaces = 'Spaces',
  Text = 'Text',
  Word = 'Word',
}

export interface Token {
  name: TokenName
  lexeme: string
  location: Span
}

const incrementPoint = (char: string, pos: Point): Point => {
  const isNewline = char === '\n'
  return {
    line: pos.line + (isNewline ? 1 : 0),
    column: isNewline ? 1 : pos.column + 1,
    offset: pos.offset + 1,
  }
}

class Lexer {
  public start: Point = { line: 1, column: 1, offset: 0 }
  public pos: Point = { line: 1, column: 1, offset: 0 }
  public tokens = [] as Token[]

  constructor(public text: string) {}

  public isDone(): boolean {
    return this.pos.offset >= this.text.length
  }

  public read(): string {
    return this.text[this.pos.offset]
  }

  public advance(by = 1): void {
    if (by === 0) {
      return
    } else {
      this.pos = incrementPoint(this.read(), this.pos)
    }

    this.advance(by - 1)
  }

  public is(pattern: string): boolean {
    return pattern === this.text.substr(this.pos.offset, pattern.length)
  }

  public accept(valid: string): boolean {
    if (this.isDone()) {
      return false
    } else if (valid.indexOf(this.read()) >= 0) {
      this.advance()
      return true
    } else {
      return false
    }
  }

  public acceptRun(valid: string): void {
    while (this.accept(valid)) {}
  }

  public distance(): number {
    return this.pos.offset - this.start.offset
  }

  public emit(name: TokenName): void {
    const lexeme = this.text.substring(this.start.offset, this.pos.offset)
    const location = { start: this.start, end: this.pos }
    this.start = this.pos
    this.tokens.push({ name, lexeme, location })
  }

  public error(message: string): void {
    const location = { start: this.pos, end: this.pos }
    this.tokens.push({ name: TokenName.Error, lexeme: message, location })
  }
}

type LexFunc = (lexer: Lexer) => LexFunc | null

const LEFT_META = '{{'
const RIGHT_META = '}}'
const SPACES = ' \t'
const LOWER_LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const UPPER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMBERS = '0123456789'

const lexText: LexFunc = lexer => {
  while (true) {
    if (lexer.isDone()) {
      if (lexer.distance() > 0) {
        lexer.emit(TokenName.Text)
      }
      lexer.emit(TokenName.EOF)
      return null
    } else if (lexer.is(LEFT_META)) {
      if (lexer.distance() > 0) {
        lexer.emit(TokenName.Text)
      }
      return lexLeftMeta
    } else {
      lexer.advance()
    }
  }
}

const lexLeftMeta: LexFunc = lexer => {
  lexer.advance(LEFT_META.length)
  lexer.emit(TokenName.LeftMeta)
  return lexInsideAction
}

const lexInsideAction: LexFunc = lexer => {
  while (true) {
    if (lexer.isDone() || lexer.is('\n')) {
      lexer.error('unclosed action')
      return null
    }

    if (lexer.is(RIGHT_META)) {
      return lexRightMeta
    }

    const char = lexer.read()

    if (lexer.accept(SPACES)) {
      return lexSpaces
    }

    if (lexer.accept(NUMBERS)) {
      return lexNumber
    }

    if (lexer.accept(LOWER_LETTERS + UPPER_LETTERS)) {
      return lexWord
    }

    switch (char) {
      case '$':
        lexer.advance()
        lexer.emit(TokenName.Dollar)
        break
      case '#':
        lexer.advance()
        lexer.emit(TokenName.Hash)
        break
      case '.':
        lexer.advance()
        lexer.emit(TokenName.Dot)
        break
      case '[':
        lexer.advance()
        lexer.emit(TokenName.LeftBracket)
        break
      case '>':
        lexer.advance()
        lexer.emit(TokenName.RightAngle)
        break
      case ']':
        lexer.advance()
        lexer.emit(TokenName.RightBracket)
        break
      case '/':
        lexer.advance()
        lexer.emit(TokenName.Slash)
        break
      default:
        lexer.error('unknown symbol')
        return null
    }
  }
}

const lexSpaces: LexFunc = lexer => {
  lexer.acceptRun(SPACES)
  lexer.emit(TokenName.Spaces)
  return lexInsideAction
}

const lexNumber: LexFunc = lexer => {
  lexer.acceptRun(NUMBERS)
  lexer.emit(TokenName.Integer)
  return lexInsideAction
}

const lexWord: LexFunc = lexer => {
  lexer.acceptRun(LOWER_LETTERS + UPPER_LETTERS + NUMBERS)
  lexer.emit(TokenName.Word)
  return lexInsideAction
}

const lexRightMeta: LexFunc = lexer => {
  lexer.advance(RIGHT_META.length)
  lexer.emit(TokenName.RightMeta)
  return lexText
}

export const toTokens = (text: string): Token[] => {
  let func: LexFunc | null = lexText
  const lexer = new Lexer(text)
  while ((func = func(lexer)) !== null) {}
  return lexer.tokens
}
