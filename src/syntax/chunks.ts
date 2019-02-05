import { Span } from '~/syntax'
import { Token, TokenName, toTokens } from '~/syntax/lex'

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
  const stream = new TokenStream(tokens)
  const chunks = [] as Chunk[]
  while (stream.isEmpty() === false) {
    chunks.push(parseChunk(stream))
  }
  return chunks
}

type TokenUnion<T> = T extends TokenName ? Token<T> : never

class TokenStream {
  private pointer = 0

  constructor(private buffer: Token[]) {}

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
      return unexpectedToken(next, ...oneOf)
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
  const dollar = stream.nextMatches(TokenName.Dollar)
  const segments = [] as PathChunkSegment[]
  while (true) {
    const peek = stream.peekMatches(TokenName.LeftBracket, TokenName.Dot)
    switch (peek.name) {
      case TokenName.LeftBracket:
        segments.push(parseOffsetSegment(stream))
        break
      case TokenName.Dot:
        segments.push(parseFieldSegment(stream))
        break
      default:
        if (segments.length === 0) {
          return { type: 'root', location: dollar.location }
        } else {
          return {
            type: 'chain',
            segments: segments,
            location: {
              start: dollar.location.start,
              end: segments[segments.length - 1].location.end,
            },
          }
        }
    }
  }
}

const parseOffsetSegment = (stream: TokenStream): PathChunkSegment => {
  const leftBracket = stream.nextMatches(TokenName.LeftBracket)
  const offset = stream.nextMatches(TokenName.Integer)
  const rightBracket = stream.nextMatches(TokenName.RightBracket)
  return {
    type: 'offset',
    offset: { text: offset.lexeme, location: offset.location },
    value: parseInt(offset.lexeme, 10),
    location: {
      start: leftBracket.location.start,
      end: rightBracket.location.end,
    },
  }
}

const parseFieldSegment = (stream: TokenStream): PathChunkSegment => {
  const dot = stream.nextMatches(TokenName.Dot)
  const word = stream.nextMatches(TokenName.Word)
  return {
    type: 'field',
    field: { text: word.lexeme, location: word.location },
    location: { start: dot.location.start, end: word.location.end },
  }
}

const unexpectedToken = (found: Token, ...expected: TokenName[]): never => {
  const name = found.name
  const line = found.location.start.line
  const column = found.location.start.column
  const where = `at (${line}:${column})`

  if (name === TokenName.Error) {
    const error = found.lexeme
    throw new Error(`${error} ${where}`)
  }

  if (expected.length === 1) {
    throw new Error(`expected ${expected[0]} but found ${name} ${where}`)
  }

  const list = expected.toLocaleString()
  throw new Error(`expected one of: ${list} but found ${name} ${where}`)
}
