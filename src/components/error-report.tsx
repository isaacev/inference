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

function toSnippet(template: string, where: Location) {
  const firstErrorLine = where.start.line
  const lastErrorLine = where.end.line

  // Convert template into line objects.
  const lines: { num?: number; text: string }[] = template
    .split('\n')
    .map((text, index) => ({ num: index + 1, text }))

  // Build the error underline.
  const underlinePadding = ' '.repeat(where.start.column - 1)
  const underlineWidth = Math.max(where.end.column - where.start.column, 1)
  const underline = underlinePadding + '^'.repeat(underlineWidth)

  // Inject underline and error message into the template.
  const message = 'hello world foo bar baz'
  lines.splice(where.start.line, 0, { text: underline + ' ' + message })

  // Limit the lines shown to the error line +/- cropping.
  const linesShownBefore = 3
  const linesShownAfter = 3
  const firstCroppedLine =
    firstErrorLine > linesShownBefore
      ? firstErrorLine - linesShownBefore - 1
      : 0
  const lastCroppedLine =
    lastErrorLine <= lines.length - linesShownAfter
      ? lastErrorLine + linesShownAfter + 1
      : lines.length
  const cropped = lines.slice(firstCroppedLine, lastCroppedLine)

  // Determine maximum gutter width.
  const gutterMax = Math.max(...cropped.map(line => `${line.num || 0}`.length))

  // Combine all lines into a single snippet.
  const formattedLines = cropped.map((line, i) => {
    const classes =
      line.num === undefined
        ? 'underline'
        : classnames('code', {
            'is-error': line.num >= firstErrorLine && line.num <= lastErrorLine,
          })

    const gutter = !line.num
      ? ' '.repeat(gutterMax)
      : `${line.num}`.padStart(gutterMax)

    return (
      <span className={classes}>
        <span className="gutter">{gutter}</span>
        <span className="border">{' | '}</span>
        <span className="text">{line.text}</span>
      </span>
    )
  })
  return putBetween(formattedLines, <br />).map(addKeys)
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
