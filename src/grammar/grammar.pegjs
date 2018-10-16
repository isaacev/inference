Statements
  = Statement*

Statement
  = Inline
  / Block
  / Text

Inline
  = Left field:Field Right { return { type: 'inline', field } }

Block
  = WithBlock
  / IsBlock
  / LoopBlock

WithBlock
  = field:OpenWith stmts:Statements CloseWith {
    return { type: 'with', field, stmts }
  }

OpenWith
  = Left "#with" _ expr:Expr Right { return expr }

CloseWith
  = Left "/with" Right

IsBlock
  = constraint:OpenIs stmts:Statements clauses:OrClause* CloseIs {
    return { type: 'is', constraint, stmts, clauses }
  }

OpenIs
  = Left "#is" _ type:Type Right { return type }

OrClause
  = Left ":or" _ constraint:Type Right stmts:Statements {
    return { constraint, stmts }
  }

CloseIs
  = Left "/is" Right

LoopBlock
  = field:OpenLoop stmts:Statements CloseLoop {
    return { type: 'loop', field, stmts }
  }

OpenLoop
  = Left "#loop" _ expr:Expr Right { return expr }

CloseLoop
  = Left "/loop" Right

Expr
  = Field
  / Type

Field
  = segments:($("." [a-zA-Z]+))+ { return { type: 'field', segments } }
  / "."                          { return { type: 'field', segments: [] } }

Type
  = List / Str / Num / Bool

List
  = "List" "(" element:Type ")" { return { type: 'list', element } }
  / "List"                      { return { type: 'list' } }

Str
  = "Str" { return { type: 'str' } }

Num
  = "Num" { return { type: 'num' } }

Bool
  = "Bool"  { return { type: 'bool' } }
  / "True"  { return { type: 'true' } }
  / "False" { return { type: 'false' } }

Left
  = "{{"

Right
  = "}}"

Text
  = text:$(!Left .)+ { return { type: 'text', text } }

_ "Whitespace"
  = [ \t\r\n]+
