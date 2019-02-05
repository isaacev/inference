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
  const err = (text: string, msg: string) => {
    expect(() => toChunks(text)).toThrow(msg)
  }

  test('unclosed inline action', () => {
    err('{{>hello', 'unclosed action')
  })

  test('broken path syntax', () => {
    err('{{>hello $.}}', 'but found RightMeta at (1:12)')
    err('{{>hello $.foo.}}', 'but found RightMeta at (1:16)')
    err('{{>hello $.foo..bar}}', 'but found Dot at (1:16)')
    err('{{>hello $[a]}}', 'but found Word at (1:12)')
    err('{{>hello $[0}}', 'but found RightMeta at (1:13)')
    err('{{>hello $0]}}', 'but found Integer at (1:11)')
    err('{{>hello $[0] }}', 'but found Spaces at (1:14)')
  })

  test('unexpected symbol in action', () => {
    err('{{>hello @}}', 'unknown symbol')
  })

  test('unexpected token in action', () => {
    err('{{# foo $}}', 'but found Spaces at (1:4)')
    err('{{$foo}}', 'but found Dollar at (1:3)')
  })
})
