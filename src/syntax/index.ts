import Path from '~/paths'

export interface Point {
  readonly line: number
  readonly column: number
  readonly offset: number
}

export interface Span {
  readonly start: Point
  readonly end: Point
}

export interface Text {
  statement: 'text'
  text: string
  location: Span
}

export interface Inline {
  statement: 'inline'
  name: { value: string; location: Span }
  path: { value: Path; location: Span }
  location: Span
}

export interface Block {
  statement: 'block'
  name: { value: string; location: Span }
  path: { value: Path; location: Span }
  statements: Statement[]
  clauses: Clause[]
  location: Span
}

export interface Clause {
  name: { value: string; location: Span }
  statements: Statement[]
  location: Span
}

export type Statement = Text | Inline | Block
