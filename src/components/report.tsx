import * as React from 'react'
import {
  ReportPart,
  SingleLineSnippet,
  MultiLineSnippet,
} from '~/errors/report'
import Type from '~/types'
import { tokenize } from '~/errors/utils'

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
            mode={props.part.mode}
            template={props.part.template}
            line={props.part.snippet.line}
            fromColumn={props.part.snippet.columns[0]}
            toColumn={props.part.snippet.columns[1]}
          />
        )
      } else {
        return (
          <ReportSnippetMultiLine
            mode={props.part.mode}
            template={props.part.template}
            fromLine={props.part.snippet.lines[0]}
            toLine={props.part.snippet.lines[1]}
          />
        )
      }
    case 'trace':
      return (
        <ReportTrace
          template={props.part.template}
          mode={props.part.mode}
          steps={props.part.steps}
        />
      )
  }
}

const ReportText = (props: { text: string }) => {
  return <p className="part-text">{replaceTicksWithInlineCode(props.text)}</p>
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
  mode: string
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
      <span className={`snippet-${props.mode}`}>{insideError}</span>
      {afterError}
      <br />
      {`${gutterSpaces} | ${columnSpaces}`}
      <span className={`snippet-${props.mode}`}>{carets}</span>
    </pre>
  )
}

const ReportSnippetMultiLine = (props: {
  mode: string
  template: string
  fromLine: number
  toLine: number
}) => {
  const fullLines = props.template
    .split('\n')
    .slice(props.fromLine - 1, props.toLine)
  const maxGutterSpaces = Math.max(
    props.fromLine.toString().length,
    props.toLine.toString().length
  )
  return (
    <pre className="part-snippet">
      {fullLines.map((fullLine, i) => {
        const lineNum = props.fromLine + i
        return (
          <React.Fragment key={i}>
            {lineNum}
            {' '.repeat(maxGutterSpaces - lineNum.toString().length)}
            {` | `}
            <span className={`snippet-${props.mode}`}>{fullLine}</span>
            <br />
          </React.Fragment>
        )
      })}
    </pre>
  )
}

const Snippet = (props: {
  template: string
  mode: string
  snippet: SingleLineSnippet | MultiLineSnippet
}) => {
  if (props.snippet.size === 'single') {
    const line = props.snippet.line
    const [fromColumn, toColumn] = props.snippet.columns
    const fullLine = props.template.split('\n')[line - 1]
    const beforeError = fullLine.slice(0, fromColumn - 1)
    const insideError = fullLine.slice(fromColumn - 1, toColumn - 1)
    const afterError = fullLine.slice(toColumn - 1)
    const totalGutterSpaces = line.toString().length
    const gutterSpaces = ' '.repeat(totalGutterSpaces)
    const totalColumnSpaces = fromColumn - 1
    const columnSpaces = ' '.repeat(totalColumnSpaces)
    const totalCarets = Math.max(1, toColumn - fromColumn)
    const carets = '^'.repeat(totalCarets)
    return (
      <React.Fragment>
        {`${line} | ${beforeError}`}
        <span className={`snippet-${props.mode}`}>{insideError}</span>
        {afterError}
        <br />
        {`${gutterSpaces} | ${columnSpaces}`}
        <span className={`snippet-${props.mode}`}>{carets}</span>
      </React.Fragment>
    )
  } else {
    const {
      lines: [fromLine, toLine],
    } = props.snippet
    const fullLines = props.template.split('\n').slice(fromLine - 1, toLine)
    const maxGutterSpaces = Math.max(
      fromLine.toString().length,
      toLine.toString().length
    )
    return (
      <pre className="part-snippet">
        {fullLines.map((fullLine, i) => {
          const lineNum = fromLine + i
          return (
            <React.Fragment key={i}>
              {lineNum}
              {' '.repeat(maxGutterSpaces - lineNum.toString().length)}
              {` | `}
              <span className={`snippet-${props.mode}`}>{fullLine}</span>
              <br />
            </React.Fragment>
          )
        })}
      </pre>
    )
  }
}

const ReportTrace = (props: {
  template: string
  mode: string
  steps: (SingleLineSnippet | MultiLineSnippet)[]
}) => {
  return (
    <pre className="part-trace">
      {props.steps.map((step, index, all) => {
        const isLastStep = all.length - 1 === index
        return (
          <React.Fragment key={index}>
            <Snippet
              template={props.template}
              mode={isLastStep ? props.mode : 'bold'}
              snippet={step}
            />
            {isLastStep ? null : <br />}
          </React.Fragment>
        )
      })}
    </pre>
  )
}

const ReportEmpty = () => null

const replaceTicksWithInlineCode = (str: string) => {
  const pat = /\`([^\`]+)\`/g
  return (
    <React.Fragment>
      {tokenize(str, pat, match => ({ code: match[1] })).map((token, i) => {
        if (typeof token === 'string') {
          return <span key={i}>{token}</span>
        } else {
          return <code key={i}>{token.code}</code>
        }
      })}
    </React.Fragment>
  )
}
