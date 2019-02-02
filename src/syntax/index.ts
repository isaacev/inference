export interface Point {
  readonly line: number
  readonly column: number
  readonly offset: number
}

export interface Span {
  readonly start: Point
  readonly end: Point
}
