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
  = LeftOpen "with" _ expr:Expr Right { return expr }

CloseWith
  = LeftClose "with" Right

IsBlock
  = constraint:OpenIs stmts:Statements clauses:OrClause* CloseIs {
    return { type: 'is', constraint, stmts, clauses }
  }

OpenIs
  = LeftOpen "is" _ type:Type Right { return type }

OrClause
  = Left ":" "or" _ constraint:Type Right stmts:Statements {
    return { constraint, stmts }
  }

CloseIs
  = LeftClose "is" Right

LoopBlock
  = field:OpenLoop stmts:Statements CloseLoop {
    return { type: 'loop', field, stmts }
  }

OpenLoop
  = LeftOpen "loop" _ expr:Expr Right { return expr }

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
  = "Dict" "(" __ pairs:PairList __ ")" { return { type: 'dict', pairs: pairs } }
  / "Dict" "(" __ ")"                   { return { type: 'dict', pairs: [] } }
  / "Dict"                              { return { type: 'dict', pairs: [] } }

PairList
  = first:DictPair rest:(_ pair:DictPair { return pair })* { return [first, ...rest] }

DictPair
  = key:Ident __ ":" __ type:Type { return { key, type } }

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

_ "Whitespace"
  = [ \t\r\n]+

__ "Optional Whitespace"
  = [ \t\r\n]*
