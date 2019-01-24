import * as React from 'react'
import { ReportPart } from '~/errors/report'
import Type from '~/types'

interface Props {
  title: string
  parts: ReportPart[]
}

export default class Report extends React.PureComponent<Props> {
  public render() {
    return (
      <div className="report">
        <h3 className="title">{this.props.title}</h3>
        <div className="parts">
          {this.props.parts.map((part, i) => (
            <Part key={i} part={part} />
          ))}
        </div>
      </div>
    )
  }
}

const Part = (props: { part: ReportPart }): JSX.Element => {
  switch (props.part.form) {
    case 'empty':
      return <ReportEmpty />
    case 'text':
      return <ReportText text={props.part.text} />
    case 'type':
      return <ReportType type={props.part.type} />
    case 'quote':
      return <ReportQuote lines={props.part.lines} />
    case 'snippet':
      if (props.part.snippet.size === 'single') {
        return (
          <ReportSnippetSingleLine
            template={props.part.template}
            line={props.part.snippet.line}
            fromColumn={props.part.snippet.columns[0]}
            toColumn={props.part.snippet.columns[1]}
          />
        )
      } else {
        return (
          <ReportSnippetMultiLine
            template={props.part.template}
            fromLine={props.part.snippet.lines[0]}
            toLine={props.part.snippet.lines[1]}
          />
        )
      }
  }
}

const ReportText = (props: { text: string }) => {
  return <p className="part-text">{props.text}</p>
}

const ReportType = (props: { type: Type }) => {
  return <pre className="part-type">{props.type.toString()}</pre>
}

const ReportQuote = (props: { lines: string[] }) => {
  return (
    <blockquote className="part-quote">
      {props.lines.map((line, i) => {
        return (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        )
      })}
    </blockquote>
  )
}

const ReportSnippetSingleLine = (props: {
  template: string
  line: number
  fromColumn: number
  toColumn: number
}) => {
  const fullLine = props.template.split('\n')[props.line - 1]
  const beforeError = fullLine.slice(0, props.fromColumn - 1)
  const insideError = fullLine.slice(props.fromColumn - 1, props.toColumn - 1)
  const afterError = fullLine.slice(props.toColumn - 1)
  const totalGutterSpaces = props.line.toString().length
  const gutterSpaces = ' '.repeat(totalGutterSpaces)
  const totalColumnSpaces = props.fromColumn - 1
  const columnSpaces = ' '.repeat(totalColumnSpaces)
  const totalCarets = Math.max(1, props.toColumn - props.fromColumn)
  const carets = '^'.repeat(totalCarets)
  return (
    <pre className="part-snippet">
      {`${props.line} | ${beforeError}`}
      <span className="snippet-error">{insideError}</span>
      {afterError}
      <br />
      {`${gutterSpaces} | ${columnSpaces}`}
      <span className="snippet-error">{carets}</span>
    </pre>
  )
}

const ReportSnippetMultiLine = (props: {
  template: string
  fromLine: number
  toLine: number
}) => {
  console.log('multi', props)
  return null
}

const ReportEmpty = () => null
