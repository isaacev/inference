import Path from '~/paths'

export interface Location {
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

export type Statement = Text | Inline | Block

export interface Text {
  type: 'text'
  text: string
  where: Location
}

export interface Inline {
  type: 'inline'
  field: Path
  where: Location
}

export interface Block {
  type: 'block'
  name: string
  field: Path
  stmts: Statement[]
  where: Location
}

export interface WithBlock extends Block {
  name: 'with'
}

export interface LoopBlock extends Block {
  name: 'loop'
  emptyClause: Statement[]
}

export interface MatchBlock extends Block {
  name: 'match'
  orClauses: Statement[][]
}
