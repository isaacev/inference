// 3rd party libraries.
import * as React from 'react'

// App libraries.
import { TemplateError, HelpfulTemplateError } from '../analysis/syntax/errors'
import { markDocument, locationsOverlap, MarkedLine, Mark } from '../markup'

interface Props {
  template: string
  errors: TemplateError[]
}

export default class ErrorReport extends React.PureComponent<Props> {
  public render() {
    return (
      <>
        {this.props.errors.map((err, index) => (
          <ErrorMessage
            key={index}
            template={this.props.template}
            error={err}
          />
        ))}
      </>
    )
  }
}

interface ErrorMessageProps {
  template: string
  error: TemplateError
}

class ErrorMessage extends React.PureComponent<ErrorMessageProps> {
  public render() {
    const markedLines = getMarkedLines(this.props.error, this.props.template)
    const gutterWidth = Math.max(
      ...markedLines.map(({ line }) => {
        return line.lineNum.toString().length
      })
    )

    return (
      <div id="error-message">
        <h2 className="headline">Syntax error</h2>
        <h3>{this.props.error.message}</h3>
        {this.props.error instanceof TemplateError && (
          <pre className="snippet">
            {markedLines.map(renderMarkedLine(gutterWidth))}
          </pre>
        )}
      </div>
    )
  }
}

const getMarkedLines = (err: TemplateError, doc: string) => {
  if (err instanceof HelpfulTemplateError) {
    if (locationsOverlap([err.help, err.origin]) === false) {
      return markDocument(doc, [
        { name: 'error', location: err.origin },
        { name: 'help', location: err.help },
      ])
    }
  }

  return markDocument(doc, [{ name: 'error', location: err.origin }])
}

const renderMarkedLine = (gutterWidth: number) => (
  { line, marks }: MarkedLine,
  i: number
) => {
  const slices = marksToSubstringSlices(line.text, marks)

  return (
    <React.Fragment key={i}>
      <span className="line">
        <span className="gutter">
          {line.lineNum.toString().padStart(gutterWidth)}
          {' | '}
        </span>
        <span className="code">
          {slices.map((slice, i) => {
            if (slice.marks.length === 0) {
              return <span key={i}>{slice.text}</span>
            } else {
              const classes = slice.marks.map(m => `markup-${m}`).join(' ')
              return (
                <span key={i} className={classes}>
                  {slice.text}
                </span>
              )
            }
          })}
        </span>
      </span>
      <br />
    </React.Fragment>
  )
}

interface MarkedSlice {
  text: string
  from: number
  to: number
  marks: string[]
}

const marksToSubstringSlices = (text: string, marks: Mark[]) => {
  return text
    .split('')
    .map(findMarksRelevantToChar(marks))
    .reduce(combineSimilarChars, [] as MarkedSlice[])
}

const findMarksRelevantToChar = (marks: Mark[]) => {
  return (ch: string, i: number): MarkedSlice => {
    return {
      text: ch,
      from: i,
      to: i + 1,
      marks: marks
        .filter(mark => mark.from <= i && mark.to > i)
        .map(mark => mark.name),
    }
  }
}

const combineSimilarChars = (acc: MarkedSlice[], next: MarkedSlice) => {
  if (acc.length === 0) {
    return [next]
  }

  const last = acc[acc.length - 1] as MarkedSlice
  if (sameStringArray(last.marks, next.marks)) {
    last.to = next.to
    last.text += next.text
    return acc
  } else {
    return acc.concat(next)
  }
}

const sameStringArray = (a: string[], b: string[]): boolean => {
  if (a.length === b.length) {
    return a.every((mem, i) => mem === b[i])
  } else {
    return false
  }
}

const MarkedLine = (props: {
  num: number
  gutterWidth: number
  text: string
  start: number
  end: number
}) => (
  <span className="line">
    <span className="gutter">
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
