import { Point } from '~/syntax'
import { TokenName, toTokens } from '~/syntax/lex'

const point = (line: number, column: number, offset: number) => ({
  line,
  column,
  offset,
})

const span = (start: Point, end: Point = start) => ({ start, end })

const mapPatternToToken = (symbol: string, name: TokenName) => {
  const text = '{{' + symbol + '}}'
  expect(toTokens(text)).toEqual([
    {
      name: TokenName.LeftMeta,
      lexeme: '{{',
      location: span(point(1, 1, 0), point(1, 3, 2)),
    },
    {
      name,
      lexeme: symbol,
      location: span(
        point(1, 3, 2),
        point(1, 3 + symbol.length, 2 + symbol.length)
      ),
    },
    {
      name: TokenName.RightMeta,
      lexeme: '}}',
      location: span(
        point(1, 3 + symbol.length, 2 + symbol.length),
        point(1, 5 + symbol.length, 4 + symbol.length)
      ),
    },
  ])
}

describe('transitions between text, actions, and EOF', () => {
  test('lex an empty string as an empty token array', () => {
    expect(toTokens('')).toEqual([])
  })

  test('lex a whitespace string to a single text token', () => {
    expect(toTokens('   ')).toEqual([
      {
        name: TokenName.Text,
        lexeme: '   ',
        location: span(point(1, 1, 0), point(1, 4, 3)),
      },
    ])
  })

  test('lex a multiline string as a single text token', () => {
    expect(toTokens('foo\n bar')).toEqual([
      {
        name: TokenName.Text,
        lexeme: 'foo\n bar',
        location: span(point(1, 1, 0), point(2, 5, 8)),
      },
    ])
  })

  test('skip text token if action is followed immediately by EOF', () => {
    expect(toTokens('a{{}}')).toEqual([
      {
        name: TokenName.Text,
        lexeme: 'a',
        location: span(point(1, 1, 0), point(1, 2, 1)),
      },
      {
        name: TokenName.LeftMeta,
        lexeme: '{{',
        location: span(point(1, 2, 1), point(1, 4, 3)),
      },
      {
        name: TokenName.RightMeta,
        lexeme: '}}',
        location: span(point(1, 4, 3), point(1, 6, 5)),
      },
    ])
  })

  test('skip text token if string begins immediately with action', () => {
    expect(toTokens('{{}}a')).toEqual([
      {
        name: TokenName.LeftMeta,
        lexeme: '{{',
        location: span(point(1, 1, 0), point(1, 3, 2)),
      },
      {
        name: TokenName.RightMeta,
        lexeme: '}}',
        location: span(point(1, 3, 2), point(1, 5, 4)),
      },
      {
        name: TokenName.Text,
        lexeme: 'a',
        location: span(point(1, 5, 4), point(1, 6, 5)),
      },
    ])
  })
})

describe('identification of patterns inside actions', () => {
  test('mark inline whitespace inside of an action', () => {
    expect(toTokens('{{ \t}}')).toEqual([
      {
        name: TokenName.LeftMeta,
        lexeme: '{{',
        location: span(point(1, 1, 0), point(1, 3, 2)),
      },
      {
        name: TokenName.Spaces,
        lexeme: ' \t',
        location: span(point(1, 3, 2), point(1, 5, 4)),
      },
      {
        name: TokenName.RightMeta,
        lexeme: '}}',
        location: span(point(1, 5, 4), point(1, 7, 6)),
      },
    ])
  })

  test('identify an integer literal inside of an action', () => {
    mapPatternToToken('123', TokenName.Integer)
  })

  test('identify word tokens with only letter characters', () => {
    mapPatternToToken('abc', TokenName.Word)
    mapPatternToToken('ABC', TokenName.Word)
    mapPatternToToken('abcDEF', TokenName.Word)
    mapPatternToToken('ABCdef', TokenName.Word)
  })

  test('identify word tokens that include number characters', () => {
    mapPatternToToken('a12', TokenName.Word)
    mapPatternToToken('A2', TokenName.Word)
  })

  test('identify miscellaneous action symbols', () => {
    mapPatternToToken(':', TokenName.Colon)
    mapPatternToToken('$', TokenName.Dollar)
    mapPatternToToken('.', TokenName.Dot)
    mapPatternToToken('#', TokenName.Hash)
    mapPatternToToken('[', TokenName.LeftBracket)
    mapPatternToToken('>', TokenName.RightAngle)
    mapPatternToToken(']', TokenName.RightBracket)
    mapPatternToToken('/', TokenName.Slash)
  })
})

describe('identification for incorrect patterns inside actions', () => {
  test('report a newline or EOF inside of an action', () => {
    expect(toTokens('{{abc')).toEqual([
      {
        name: TokenName.LeftMeta,
        lexeme: '{{',
        location: span(point(1, 1, 0), point(1, 3, 2)),
      },
      {
        name: TokenName.Word,
        lexeme: 'abc',
        location: span(point(1, 3, 2), point(1, 6, 5)),
      },
      {
        name: TokenName.Error,
        lexeme: 'unclosed action',
        location: span(point(1, 6, 5)),
      },
    ])

    expect(toTokens('{{abc\n')).toEqual([
      {
        name: TokenName.LeftMeta,
        lexeme: '{{',
        location: span(point(1, 1, 0), point(1, 3, 2)),
      },
      {
        name: TokenName.Word,
        lexeme: 'abc',
        location: span(point(1, 3, 2), point(1, 6, 5)),
      },
      {
        name: TokenName.Error,
        lexeme: 'unclosed action',
        location: span(point(1, 6, 5)),
      },
    ])
  })

  test('report an unsupported symbol inside of an action', () => {
    expect(toTokens('{{@}}')).toEqual([
      {
        name: TokenName.LeftMeta,
        lexeme: '{{',
        location: span(point(1, 1, 0), point(1, 3, 2)),
      },
      {
        name: TokenName.Error,
        lexeme: 'unknown symbol',
        location: span(point(1, 3, 2)),
      },
    ])
  })
})
