Root
  = Statement*

Statement
  = Text
  / Inline
  / Block

Text
  = text:$(!Left .)+ { return { type: 'text', text, pos: location() } }

Inline
  = Left field:Field Right { return { type: 'inline', field, pos: location() } }

Block
  = Left "#" open:Name __ field:Field Right stmts:Statement* clauses:Clause* Left "/" close:Name Right
    { return { type: 'block', open, close, field, stmts, clauses, pos: location() } }

Clause
  = Left ":" name:Name Right stmts:Statement*
    { return { name, stmts, pos: location() } }

Field
  = ChildField
  / RootField

ChildField
  = segments:("." Name)+ { return segments.map(s => `.${s[1].text}`) }

RootField
  = "." { return [] }

Name "name"
  = text:$([a-zA-Z]+) { return { text, pos: location() } }

Left "left delimiter"
  = "{{"

Right "right delimiter"
  = "}}"

__ "required whitespace"
  = [ \t\r\n]+

_ "optional whitespace"
  = [ \t\r\n]*
