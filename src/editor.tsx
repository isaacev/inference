// 3rd party libraries.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { Editor, EditorConfiguration, EditorChange } from 'codemirror'
import * as localforage from 'localforage'

// Import modes.
require('./mode')
require('codemirror/mode/xml/xml')

// App libraries.
import { Point, Range } from './points'
import * as paths from './paths'
import * as grammar from './grammar'
import { scope, types } from './semantics'

const CODEMIRROR_OPTIONS: EditorConfiguration = {
  lineNumbers: true,
  theme: 'blackboard',
  mode: 'venture',
  indentUnit: 2,
  indentWithTabs: false,
  extraKeys: {
    Tab: cm => cm.getDoc().replaceSelection('  '),
  },
}

interface AppProps {
  initialTemplate: string
  onChange: (template: string) => void
}

interface AppState {
  template: string
  syntax: grammar.Statements | grammar.SyntaxError
}

class App extends React.Component<AppProps, AppState> {
  private static parse(tmpl: string): grammar.Statements | grammar.SyntaxError {
    try {
      return grammar.parse(tmpl)
    } catch (err) {
      if (!(err instanceof grammar.SyntaxError)) {
        throw err
      }

      return err
    }
  }

  constructor(props: AppProps) {
    super(props)

    // Initialize state.
    this.state = {
      template: this.props.initialTemplate,
      syntax: App.parse(this.props.initialTemplate),
    }

    // Bind component methods.
    this.onBeforeChange = this.onBeforeChange.bind(this)
  }

  private onBeforeChange(editor: Editor, diff: EditorChange, tmpl: string) {
    // Update state with new template and syntax tree.
    this.setState({ template: tmpl, syntax: App.parse(tmpl) })

    // Trigger `onChange` callback.
    this.props.onChange(tmpl)
  }

  public render() {
    return (
      <>
        <div id="left">
          <CodeMirror
            value={this.state.template}
            onBeforeChange={this.onBeforeChange}
            options={CODEMIRROR_OPTIONS}
          />
        </div>
        <div id="right">
          <DebugPanel
            template={this.state.template}
            syntax={this.state.syntax}
          />
        </div>
      </>
    )
  }
}

interface DebugPanelProps {
  template: string
  syntax: grammar.Statements | grammar.SyntaxError
}

class DebugPanel extends React.PureComponent<DebugPanelProps> {
  public render() {
    if (this.props.syntax instanceof grammar.SyntaxError) {
      return (
        <ErrorMessage
          template={this.props.template}
          error={this.props.syntax}
        />
      )
    } else {
      return <em>all good</em>
    }
  }
}

interface ErrorMessageProps {
  template: string
  error: grammar.SyntaxError
}

class ErrorMessage extends React.PureComponent<ErrorMessageProps> {
  public static templateSnippet(template: string, where: Range | Point) {
    if (where instanceof Point) {
      where = new Range(where, where)
    }

    // Which line does the error start on?
    const firstErrorLine = where.left.line
    const lastErrorLine = where.right.line

    // Convert template into line objects.
    const lines = template
      .split('\n')
      .map((text, index) => ({ num: index + 1, text }))

    // Build the error underline.
    const underlinePadding = ' '.repeat(where.left.column - 1)
    const underlineWidth = Math.max(where.right.column - where.left.column, 1)
    const underline = underlinePadding + '^'.repeat(underlineWidth)
    lines.splice(where.left.line, 0, { num: where.left.line, text: underline })

    // Limit the lines shown to the error line +/- cropping.
    const linesAbove = 2
    const linesBelow = 0
    const firstCroppedLine =
      firstErrorLine > linesAbove ? firstErrorLine - linesAbove - 1 : 0
    const lastCroppedLine =
      lastErrorLine <= lines.length - linesBelow
        ? lastErrorLine + linesBelow + 1
        : lines.length
    const cropped = lines.slice(firstCroppedLine, lastCroppedLine)

    // Compute maximum gutter width.
    const gutterWidth = Math.max(...cropped.map(({ num }) => `${num}`.length))

    let before = 0
    let snippet = ''
    for (const { num, text } of cropped) {
      const gutter =
        before === num
          ? ' '.repeat(gutterWidth)
          : num.toString().padStart(gutterWidth)
      before = num

      const line = `${gutter} | ${text}`
      if (snippet === '') {
        snippet = line
      } else {
        snippet += '\n' + line
      }
    }

    return snippet
  }

  public render() {
    const {
      location: { start, end },
    } = this.props.error
    const range = new Range(
      new Point(start.line, start.column),
      new Point(end.line, end.column)
    )
    const snippet = ErrorMessage.templateSnippet(this.props.template, range)
    return (
      <div id="error-message">
        <h2 className="headline">Syntax error</h2>
        <h3>{this.props.error.message}</h3>
        <pre className="snippet">{snippet}</pre>
      </div>
    )
  }
}

const series = (low: number, high: number): number[] => {
  if (low > high) {
    return []
  } else {
    const range = [] as number[]
    for (let i = low; i <= high; i++) {
      range.push(i)
    }
    return range
  }
}

localforage.getItem<string>('template').then(tmpl => {
  ReactDOM.render(
    <App
      initialTemplate={tmpl || ''}
      onChange={tmpl => localforage.setItem<string>('template', tmpl)}
    />,
    document.querySelector('#main')
  )
})
