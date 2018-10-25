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
  / LoopBlock

WithBlock
  = field:OpenWith stmts:Statements CloseWith {
    return { type: 'with', field, stmts }
  }

OpenWith
  = LeftOpen "with" __ field:Field Right { return field }

CloseWith
  = LeftClose "with" Right

LoopBlock
  = field:OpenLoop stmts:Statements CloseLoop {
    return { type: 'loop', field, stmts }
  }

OpenLoop
  = LeftOpen "loop" __ field:Field Right { return field }

CloseLoop
  = LeftClose "loop" Right

Field
  = segments:($("." Ident))+ { return { type: 'field', segments } }
  / "."                      { return { type: 'field', segments: [] } }

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
