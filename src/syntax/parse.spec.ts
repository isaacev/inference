import { toStatements } from '~/syntax/parse'
import Path from '~/paths'
import Offset from '~/paths/segments/offset'
import Field from '~/paths/segments/field'

const stmt = (text: string, stmts: any[]) => {
  expect(toStatements(text)).toEqual(stmts)
}

const text = (text: string) => ({
  statement: 'text',
  text,
  location: expect.anything(),
})

const inline = (name: string, path: Path) => ({
  statement: 'inline',
  name: { value: name, location: expect.anything() },
  path: { value: path, location: expect.anything() },
  location: expect.anything(),
})

const block = (
  name: string,
  path: Path,
  statements: any[] = [],
  clauses: any[] = []
) => ({
  statement: 'block',
  name: { value: name, location: expect.anything() },
  path: { value: path, location: expect.anything() },
  statements,
  clauses,
  location: expect.anything(),
})

const clause = (name: string, statements: any[]) => ({
  name: { value: name, location: expect.anything() },
  statements,
  location: expect.anything(),
})

describe('text, inline, and block statements', () => {
  test('parse text statements', () => {
    stmt('', [])
    stmt('hello world', [text('hello world')])
  })

  test('parse inline statements', () => {
    stmt('{{>foo .}}', [inline('foo', new Path())])
    stmt('{{>foo foo}}', [inline('foo', new Path([new Field('foo')]))])
    stmt('{{>foo [0]}}', [inline('foo', new Path([new Offset(0)]))])
  })

  test('parse block statement without clauses', () => {
    stmt('{{#foo .}}{{/foo}}', [block('foo', new Path(), [])])
    stmt('{{#foo .}}{{>bar .}} {{/foo}}', [
      block('foo', new Path(), [inline('bar', new Path()), text(' ')]),
    ])
    stmt('{{#foo .}} hello {{/foo}}', [
      block('foo', new Path(), [text(' hello ')]),
    ])
    stmt('{{#foo foo}} hello {{/foo}}', [
      block('foo', new Path([new Field('foo')]), [text(' hello ')]),
    ])
    stmt('{{#foo [0]}} hello {{/foo}}', [
      block('foo', new Path([new Offset(0)]), [text(' hello ')]),
    ])
  })

  test('parse block statement with clauses', () => {
    stmt('{{#foo .}}hello{{:else}}world{{/foo}}', [
      block(
        'foo',
        new Path(),
        [text('hello')],
        [clause('else', [text('world')])]
      ),
    ])

    stmt('{{#foo .}}hello{{:bar}}{{:baz}}{{/foo}}', [
      block(
        'foo',
        new Path(),
        [text('hello')],
        [clause('bar', []), clause('baz', [])]
      ),
    ])
  })
})

describe('identify syntax errors', () => {
  const err = (text: string, msg: string) => {
    expect(() => toStatements(text)).toThrow(msg)
  }

  test('unclosed block', () => {
    err('{{#hello .}}', 'unclosed block at (1:13)')
    err('{{#hello .}} world', 'unclosed block at (1:19)')
    err('{{#hello .}} world {{:else}}', 'unclosed block at (1:29)')
  })

  test('mismatched closing action', () => {
    err('{{#foo .}} world {{/fooo}}', 'mismatched closing action at (1:21)')
  })
})
