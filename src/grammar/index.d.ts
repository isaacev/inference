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

export type Block = WithBlock | IsBlock | LoopBlock

export interface WithBlock {
  type: 'with'
  field: Field
  stmts: Statements
}

export interface IsBlock {
  type: 'is'
  constraint: Type
  stmts: Statements
  clauses: { constraint: Type; stmts: Statements }[]
}

export interface LoopBlock {
  type: 'loop'
  field: Field
  stmts: Statements
}

interface Text {
  type: 'text'
  text: string
}

export type Expression = Field | Type

export interface Field {
  type: 'field'
  segments: string[]
}

export type Type = List | Str | Num | Bool | True | False

export interface List {
  type: 'list'
  element?: Type
}

export interface Str {
  type: 'str'
}

export interface Num {
  type: 'num'
}

export interface Bool {
  type: 'bool'
}

export interface True {
  type: 'true'
}

export interface False {
  type: 'false'
}
