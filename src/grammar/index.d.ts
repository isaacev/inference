export function parse(tmpl: string): Statements

interface Location {
  start: {
    offset: number
    line: number
    column: number
  }
  end: {
    offset: number
    line: number
    column: number
  }
}

export declare class SyntaxError {
  message: string
  expected: { type: string; text: string }[] | null
  found: string | null
  location: Location
}

export type Statements = Statement[]

export type Statement = Inline | Block | Text

export interface Inline {
  type: 'inline'
  field: Field
}

export type Block = WithBlock | LoopBlock | MatchBlock

export interface WithBlock {
  type: 'with'
  field: Field
  stmts: Statements
}

export interface LoopBlock {
  type: 'loop'
  field: Field
  stmts: Statements
}

export interface MatchBlock {
  type: 'match'
  field: Field
  stmts: Statements
  clauses: Statements[]
}

interface Text {
  type: 'text'
  text: string
}

export interface Field {
  type: 'field'
  segments: string[]
}
