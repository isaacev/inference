import { toChunks } from '~/syntax/chunks'

const location = expect.anything()
const toWord = (text: string) => ({ text, location })
const toChain = (segments: any[]) => ({ type: 'chain', segments, location })
const toRoot = () => ({ type: 'root', location })
const toField = (field: string) => ({
  type: 'field',
  field: toWord(field),
  location,
})
const toOffset = (offset: number) => ({
  type: 'offset',
  offset: toWord(offset.toString()),
  value: offset,
  location,
})

describe('transitions between text, actions, and EOF', () => {
  test('an empty template returns 0 chunks', () => {
    expect(toChunks('')).toEqual([])
  })
})

describe('identify chunk types', () => {
  test('text chunks', () => {
    expect(toChunks('hello')).toEqual([
      {
        chunk: 'text',
        text: 'hello',
        location,
      },
    ])

    expect(toChunks('hello\nworld')).toEqual([
      {
        chunk: 'text',
        text: 'hello\nworld',
        location,
      },
    ])
  })

  test('inline chunks', () => {
    expect(toChunks('{{>hello $.world}}')).toEqual([
      {
        chunk: 'inline',
        name: toWord('hello'),
        path: toChain([toField('world')]),
        location,
      },
    ])

    expect(toChunks('{{>hello $}}')).toEqual([
      {
        chunk: 'inline',
        name: toWord('hello'),
        path: toRoot(),
        location,
      },
    ])
  })

  test('block opening chunks', () => {
    expect(toChunks('{{#foo $[0]}}')).toEqual([
      {
        chunk: 'block-open',
        name: toWord('foo'),
        path: toChain([toOffset(0)]),
        location,
      },
    ])

    expect(toChunks('{{#foo $}}')).toEqual([
      {
        chunk: 'block-open',
        name: toWord('foo'),
        path: toRoot(),
        location,
      },
    ])
  })

  test('block clause chunks', () => {
    expect(toChunks('{{:else}}')).toEqual([
      {
        chunk: 'block-clause',
        name: toWord('else'),
        location,
      },
    ])
  })

  test('block closing chunks', () => {
    expect(toChunks('{{/foo}}')).toEqual([
      {
        chunk: 'block-close',
        name: toWord('foo'),
        location,
      },
    ])
  })
})

describe('identify syntax errors', () => {
  test('unclosed inline action', () => {
    expect(() => toChunks('{{>hello')).toThrow('unclosed action')
  })

  test('unexpected symbol in action', () => {
    expect(() => toChunks('{{>hello @}}')).toThrow('unknown symbol')
  })

  test('unexpected token in action', () => {
    expect(() => toChunks('{{# foo $}}')).toThrow('but found Spaces')
    expect(() => toChunks('{{$foo}}')).toThrow('but found Dollar')
  })
})
