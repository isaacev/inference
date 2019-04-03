import { Span } from '~/syntax'
import { Token, TokenName, toTokens } from '~/syntax/lex'
import * as errors from '~/syntax/errors'

export type Word = { text: string; location: Span }

export type PathChunkSegment =
  | { type: 'offset'; offset: Word; value: number; location: Span }
  | { type: 'field'; field: Word; location: Span }

export type PathChunk =
  | { type: 'root'; location: Span }
  | { type: 'chain'; segments: PathChunkSegment[]; location: Span }

export interface TextChunk {
  chunk: 'text'
  text: string
  location: Span
}

export interface InlineChunk {
  chunk: 'inline'
  name: Word
  path: PathChunk
  location: Span
}

export interface BlockOpenChunk {
  chunk: 'block-open'
  name: Word
  path: PathChunk
  location: Span
}

export interface BlockClauseChunk {
  chunk: 'block-clause'
  name: Word
  location: Span
}

export interface BlockCloseChunk {
  chunk: 'block-close'
  name: Word
  location: Span
}

export type Chunk =
  | TextChunk
  | InlineChunk
  | BlockOpenChunk
  | BlockClauseChunk
  | BlockCloseChunk

export const toChunks = (text: string): Chunk[] => {
  const tokens = toTokens(text)
  const stream = new TokenStream(text, tokens)
  const chunks = [] as Chunk[]
  while (stream.isEmpty() === false) {
    chunks.push(parseChunk(stream))
  }
  return chunks
}

type TokenUnion<T> = T extends TokenName ? Token<T> : never

class TokenStream {
  private pointer = 0

  constructor(private text: string, private buffer: Token[]) {}

  public isEmpty(): boolean {
    return this.pointer >= this.buffer.length
  }

  public peekMatches<T extends TokenName>(...oneOf: T[]): TokenUnion<T> {
    const peek = this.buffer[this.pointer]

    if (oneOf.every(expected => expected !== peek.name)) {
      return peek as never
    }

    return peek as TokenUnion<T>
  }

  public nextMatches<T extends TokenName>(...oneOf: T[]): TokenUnion<T> {
    const next = this.buffer[this.pointer++]

    if (oneOf.every(expected => expected !== next.name)) {
      return unexpectedToken(this.text, next, ...oneOf)
    }

    return next as TokenUnion<T>
  }
}

const parseChunk = (stream: TokenStream): Chunk => {
  const next = stream.nextMatches(TokenName.Text, TokenName.LeftMeta)
  switch (next.name) {
    case TokenName.Text:
      return parseText(next, stream)
    case TokenName.LeftMeta:
      return parseAction(next, stream)
  }
}

type Parser<T extends TokenName> = (tok: Token<T>, stream: TokenStream) => Chunk

const parseText: Parser<TokenName.Text> = text => {
  return {
    chunk: 'text',
    text: text.lexeme,
    location: text.location,
  }
}

const parseAction: Parser<TokenName.LeftMeta> = (leftMeta, stream) => {
  const next = stream.nextMatches(
    TokenName.RightAngle,
    TokenName.Hash,
    TokenName.Colon,
    TokenName.Slash
  )
  switch (next.name) {
    case TokenName.RightAngle:
      return parseInlineAction(leftMeta, stream)
    case TokenName.Hash:
      return parseBlockOpen(leftMeta, stream)
    case TokenName.Colon:
      return parseBlockClause(leftMeta, stream)
    case TokenName.Slash:
      return parseBlockClose(leftMeta, stream)
  }
}

const parseInlineAction: Parser<TokenName.LeftMeta> = (leftMeta, stream) => {
  const word = stream.nextMatches(TokenName.Word)
  stream.nextMatches(TokenName.Spaces)
  const path = parsePath(stream)
  const rightMeta = stream.nextMatches(TokenName.RightMeta)
  return {
    chunk: 'inline',
    name: { text: word.lexeme, location: word.location },
    path: path,
    location: { start: leftMeta.location.start, end: rightMeta.location.end },
  }
}

const parseBlockOpen: Parser<TokenName.LeftMeta> = (leftMeta, stream) => {
  const word = stream.nextMatches(TokenName.Word)
  stream.nextMatches(TokenName.Spaces)
  const path = parsePath(stream)
  const rightMeta = stream.nextMatches(TokenName.RightMeta)
  return {
    chunk: 'block-open',
    name: { text: word.lexeme, location: word.location },
    path: path,
    location: { start: leftMeta.location.start, end: rightMeta.location.end },
  }
}

const parseBlockClause: Parser<TokenName.LeftMeta> = (leftMeta, stream) => {
  const word = stream.nextMatches(TokenName.Word)
  const rightMeta = stream.nextMatches(TokenName.RightMeta)
  return {
    chunk: 'block-clause',
    name: { text: word.lexeme, location: word.location },
    location: { start: leftMeta.location.start, end: rightMeta.location.end },
  }
}

const parseBlockClose: Parser<TokenName.LeftMeta> = (leftMeta, stream) => {
  const word = stream.nextMatches(TokenName.Word)
  const rightMeta = stream.nextMatches(TokenName.RightMeta)
  return {
    chunk: 'block-close',
    name: { text: word.lexeme, location: word.location },
    location: { start: leftMeta.location.start, end: rightMeta.location.end },
  }
}

const parsePath = (stream: TokenStream): PathChunk => {
  if (stream.peekMatches(TokenName.Dot).name === TokenName.Dot) {
    const dot = stream.nextMatches(TokenName.Dot)
    return { type: 'root', location: dot.location }
  }

  const segments = [] as PathChunkSegment[]
  const next = stream.nextMatches(TokenName.Word, TokenName.LeftBracket)
  switch (next.name) {
    case TokenName.LeftBracket: {
      const integer = stream.nextMatches(TokenName.Integer)
      const rightBracket = stream.nextMatches(TokenName.RightBracket)
      segments.push({
        type: 'offset',
        offset: { text: integer.lexeme, location: integer.location },
        value: parseInt(integer.lexeme, 10),
        location: {
          start: next.location.start,
          end: rightBracket.location.end,
        },
      })
      break
    }
    case TokenName.Word:
      segments.push({
        type: 'field',
        field: { text: next.lexeme, location: next.location },
        location: next.location,
      })
      break
  }

  while (true) {
    const peek = stream.peekMatches(TokenName.Dot, TokenName.LeftBracket)
    switch (peek.name) {
      case TokenName.LeftBracket: {
        const leftBracket = stream.nextMatches(TokenName.LeftBracket)
        const integer = stream.nextMatches(TokenName.Integer)
        const rightBracket = stream.nextMatches(TokenName.RightBracket)
        segments.push({
          type: 'offset',
          offset: { text: integer.lexeme, location: integer.location },
          value: parseInt(integer.lexeme, 10),
          location: {
            start: leftBracket.location.start,
            end: rightBracket.location.end,
          },
        })
        break
      }
      case TokenName.Dot: {
        const dot = stream.nextMatches(TokenName.Dot)
        const word = stream.nextMatches(TokenName.Word)
        segments.push({
          type: 'field',
          field: { text: word.lexeme, location: word.location },
          location: { start: dot.location.start, end: word.location.end },
        })
        break
      }
      default:
        return {
          type: 'chain',
          segments,
          location: {
            start: next.location.start,
            end: segments[segments.length - 1].location.end,
          },
        }
    }
  }
}

const unexpectedToken = (
  text: string,
  found: Token,
  ...expected: TokenName[]
): never => {
  const name = found.name
  const line = found.location.start.line
  const column = found.location.start.column
  const where = `at (${line}:${column})`

  if (name === TokenName.Error) {
    throw errors.lexicalError({
      message: found.lexeme,
      where: found.location,
      template: text,
    })
  }

  if (expected.length === 1) {
    const message = `expected ${expected[0]} but found ${name} ${where}`
    throw errors.lexicalError({
      message,
      where: found.location,
      template: text,
    })
  }

  const list = expected.toLocaleString()
  const message = `expected one of: ${list} but found ${name} ${where}`
  throw errors.lexicalError({
    message,
    where: found.location,
    template: text,
  })
}
