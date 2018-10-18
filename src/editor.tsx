// 3rd party libraries.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { Editor, EditorConfiguration, EditorChange } from 'codemirror'
import * as localforage from 'localforage'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faPlus, faArrowsV } from '@fortawesome/pro-regular-svg-icons'

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
  model: scope.Root | grammar.SyntaxError
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

  private static model(tmpl: string): scope.Root | grammar.SyntaxError {
    try {
      const stmts = grammar.parse(tmpl)
      const model = scope.infer(stmts)
      return model
    } catch (err) {
      if (err instanceof grammar.SyntaxError) {
        return err
      } else {
        throw err
      }
    }
  }

  constructor(props: AppProps) {
    super(props)

    // Initialize state.
    // const syntax = App.parse(this.props.initialTemplate)
    // const constraints = (syntax instanceof grammar.SyntaxError) ? App.infer(syntax)
    // this.state = { template: this.props.initialTemplate, syntax, constraints }

    this.state = {
      template: props.initialTemplate,
      model: App.model(props.initialTemplate),
    }

    // Bind component methods.
    this.onBeforeChange = this.onBeforeChange.bind(this)
  }

  private onBeforeChange(editor: Editor, diff: EditorChange, tmpl: string) {
    // Update state with new template and syntax tree.
    this.setState({
      template: tmpl,
      model: App.model(tmpl),
    })

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
          <DebugPanel template={this.state.template} model={this.state.model} />
        </div>
      </>
    )
  }
}

interface DebugPanelProps {
  template: string
  model: scope.Root | grammar.SyntaxError
}

class DebugPanel extends React.PureComponent<DebugPanelProps> {
  public render() {
    if (this.props.model instanceof grammar.SyntaxError) {
      return (
        <ErrorMessage template={this.props.template} error={this.props.model} />
      )
    } else {
      return (
        <div id="form">
          <Inputs path={new paths.Path()} type={this.props.model.context} />
        </div>
      )
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

interface InputsProps {
  path: paths.Path
  type: types.Type
}

class Inputs extends React.PureComponent<InputsProps> {
  public render() {
    if (this.props.type instanceof types.Str) {
      return <Textbox path={this.props.path} />
    } else if (this.props.type instanceof types.Dict) {
      return this.props.type.pairs.map(pair => {
        const path = this.props.path.concat(new paths.Field(pair.key))
        const type = pair.value

        if (type instanceof types.Nil) {
          return null
        } else {
          return <Inputs key={path.toString()} path={path} type={type} />
        }
      })
    } else if (this.props.type instanceof types.List) {
      const label = (this.props.path.tail() || '').toString()
      const path = this.props.path
      const type = this.props.type
      return (
        <div className="group">
          <label>{label}</label>
          <Repeater path={path} type={type} />
        </div>
      )
    } else {
      const path = this.props.path.toString()
      const type = this.props.type.toString()
      return (
        <pre className="group">
          {path} {type}
        </pre>
      )
    }
  }
}

function Textbox(props: { path: paths.Path }) {
  const id = props.path.toString()
  const label = (props.path.tail() || '').toString()
  return (
    <div className="group">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" />
    </div>
  )
}

function Textarea(props: { id: paths.Path; label: string; rows?: number }) {
  return (
    <div className="group">
      <label htmlFor={props.id.toString()}>{props.label}</label>
      <textarea id={props.id.toString()} rows={props.rows || 4} />
    </div>
  )
}

interface RepeaterProps {
  path: paths.Path
  type: types.List
}

interface RepeaterState {
  count: number
}

class Repeater extends React.Component<RepeaterProps, RepeaterState> {
  constructor(props: RepeaterProps) {
    super(props)
    this.state = {
      count: 3,
    }
  }

  public render() {
    return (
      <div className="group group-repeater">
        {repeat(this.state.count, i => {
          const path = this.props.path.concat(new paths.Index(i))
          const type = this.props.type.element
          return (
            <div className="instance" key={i}>
              <RepeaterControls />
              <div className="inputs">
                <Inputs path={path} type={type} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}

function RepeaterControls() {
  return (
    <div className="controls">
      <button className="delete"><FontAwesomeIcon icon={faTimes} /></button>
      <button className="move"><FontAwesomeIcon icon={faArrowsV} /></button>
    </div>
  )
}

function repeat<T>(num: number, fn: (num: number) => T): T[] {
  const acc = [] as T[]
  for (let i = 0; i < num; i++) {
    acc.push(fn(i))
  }
  return acc
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
