export function parse(tmpl: string): Root

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

export type Root = Statement[]

export type Statement = Text | Inline | Block

export interface Text {
  type: 'text'
  text: string
  pos: Location
}

export interface Inline {
  type: 'inline'
  field: Field
  pos: Location
}

export interface Block {
  type: 'block'
  open: Name
  close: Name
  field: Field
  stmts: Statement[]
  clauses: Clause[]
  pos: Location
}

interface Clause {
  name: Name
  stmts: Statement[]
  pos: Location
}

interface Name {
  text: string
  pos: Location
}

type Field = string[]
