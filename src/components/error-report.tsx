// 3rd party libraries.
import * as React from 'react'
import classnames from 'classnames'

// App libraries.
import { TypeError } from '../semantics'
import { SyntaxError, Location } from '../grammar'
import { Point, Range } from '../points'

interface Props {
  template: string
  error: SyntaxError | TypeError
}

export default class ErrorReport extends React.PureComponent<Props> {
  public render() {
    return (
      <div id="error-message">
        <h2 className="headline">Syntax error</h2>
        <h3>{this.props.error.message}</h3>
        {this.props.error instanceof SyntaxError && (
          <pre className="snippet">
            {toSnippet(this.props.template, this.props.error.location)}
          </pre>
        )}
      </div>
    )
  }
}

const LINES_BEFORE = 3
const LINES_AFTER = 3

const UnmarkedLine = (props: {
  num: number
  gutterWidth: number
  text: string
}) => (
  <span className="line">
    <span className="gutter">
      {props.num.toString().padStart(props.gutterWidth)}
      {' | '}
    </span>
    <span className="code">{props.text}</span>
  </span>
)

const MarkedLine = (props: {
  num: number
  gutterWidth: number
  text: string
  start: number
  end: number
}) => (
  <span className="line">
    <span className="gutter is-error">
      {props.num.toString().padStart(props.gutterWidth)}
      {' | '}
    </span>
    <span className="code">
      {props.start > 0 ? props.text.slice(0, props.start) : ''}
      <span className="is-error">
        {props.text.slice(props.start, props.end)}
      </span>
      {props.end < props.text.length - 1 ? props.text.slice(props.end) : ''}
    </span>
  </span>
)

const toSnippet = (template: string, { start, end }: Location) => {
  // Split template into individual lines, each tagged with the respective line
  // number and starting offset
  const lines = stringToLines(template)

  // Iterate over each line in the template and if it contains an error or is
  // closer to the error than `LINES_BEFORE` or `LINES_AFTER`, include that line
  // in the final snippet
  const includedLines = lines.filter(({ num }) => {
    return num >= start.line - LINES_BEFORE && num <= end.line + LINES_AFTER
  })

  // For each included line, mark it with which sub-slice should be colored red
  const markedLines = includedLines.map(line => {
    const beforeError = line.offset + line.text.length < start.offset
    const afterError = line.offset > end.offset
    if (beforeError || afterError) {
      return { indices: null, line }
    } else {
      const from = Math.max(0, start.offset - line.offset)
      const to = Math.min(line.text.length, end.offset - line.offset)
      return { indices: [from, to], line }
    }
  }) as {
    indices: [number, number] | null
    line: { num: number; offset: number; text: string }
  }[]

  // How many characters should be allocated for the line-number gutter?
  const gutterWidth = Math.max(
    ...markedLines.map(({ line }) => {
      return line.num.toString().length
    })
  )

  const lineElements = markedLines.map(({ indices, line }) => {
    if (indices === null) {
      return (
        <UnmarkedLine
          num={line.num}
          gutterWidth={gutterWidth}
          text={line.text}
        />
      )
    } else {
      return (
        <MarkedLine
          num={line.num}
          gutterWidth={gutterWidth}
          text={line.text}
          start={indices[0]}
          end={indices[1]}
        />
      )
    }
  })

  return putBetween(lineElements, <br />).map(addKeys)
}

const stringToLines = (str: string, num = 1, offset = 0) => {
  return str.split('\n').map((text, index) => {
    const line = {
      text,
      num: num++,
      offset: offset + index,
    }
    offset += text.length
    return line
  })
}

function putBetween<T>(arr: T[], glue: T): T[] {
  return arr.reduce(
    (acc, elem, i) => {
      if (i > 0) {
        return acc.concat(glue, elem)
      } else {
        return acc.concat(elem)
      }
    },
    [] as T[]
  )
}

function addKeys(elem: JSX.Element, index: number) {
  return <React.Fragment key={index}>{elem}</React.Fragment>
}
