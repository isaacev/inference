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
  = LeftOpen "with" __ expr:Expr Right { return expr }

CloseWith
  = LeftClose "with" Right

IsBlock
  = constraint:OpenIs stmts:Statements clauses:OrClause* CloseIs {
    return { type: 'is', constraint, stmts, clauses }
  }

OpenIs
  = LeftOpen "is" __ type:Type Right { return type }

OrClause
  = Left ":" "or" __ constraint:Type Right stmts:Statements {
    return { constraint, stmts }
  }

CloseIs
  = LeftClose "is" Right

LoopBlock
  = field:OpenLoop stmts:Statements CloseLoop {
    return { type: 'loop', field, stmts }
  }

OpenLoop
  = LeftOpen "loop" __ expr:Expr Right { return expr }

CloseLoop
  = LeftClose "loop" Right

Expr
  = Field
  / Type

Field
  = segments:($("." Ident))+ { return { type: 'field', segments } }
  / "."                      { return { type: 'field', segments: [] } }

Type
  = Dict / List / Str / Num / Bool

Dict
  = "Dict" "(" _ pairs:PairList _ ")" { return { type: 'dict', pairs: pairs } }
  / "Dict" "(" _ ")"                   { return { type: 'dict', pairs: [] } }
  / "Dict"                              { return { type: 'dict', pairs: [] } }

PairList
  = first:DictPair rest:(__ pair:DictPair { return pair })* { return [first, ...rest] }

DictPair
  = key:Ident _ ":" _ type:Type { return { key, type } }

List
  = "List" "(" element:Type ")" { return { type: 'list', element } }
  / "List"                      { return { type: 'list' } }

Str
  = "Str"                     { return { type: 'str' } }
  / '"' value:$([^\"\n]+) '"' { return { type: 'str', value } }

Num
  = "Num" { return { type: 'num' } }

Bool
  = "Bool"  { return { type: 'bool' } }
  / "True"  { return { type: 'true' } }
  / "False" { return { type: 'false' } }

Ident "Identifier"
  = $([a-zA-Z]+)

Left
  = "{{"

LeftOpen
  = "{{#"

LeftClose
  = "{{/"

Right
  = "}}"

Text
  = text:$(!Left .)+ { return { type: 'text', text } }

__ "whitespace"
  = [ \t\r\n]+

_ "optional whitespace"
  = [ \t\r\n]*
