import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { Editor, EditorChange, TextMarker } from 'codemirror'
import * as localforage from 'localforage'
import { DEFAULT_TEMPLATE } from './examples'
import * as lexer from './lexer'
import * as parser from './parser'
import * as scopes from './scopes'
import * as errors from './errors'

interface AppProps {
  initialTemplate: string
}

interface AppState {
  template: string
  scope: errors.TemplateError | scopes.Root
  cursor: { line: number; column: number }
  marks: TextMarker[]
}

const toScope = (tmpl: string): errors.TemplateError | scopes.Root => {
  try {
    const tokens = lexer.toTokens(tmpl)
    const tree = parser.toTree(tokens)
    return scopes.toScope(tree)
  } catch (err) {
    if (err instanceof errors.TemplateError) {
      return err
    } else {
      throw err
    }
  }
}

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props)
    this.state = {
      template: props.initialTemplate,
      scope: toScope(props.initialTemplate),
      cursor: { line: 1, column: 1 },
      marks: [],
    }
    this.handleBeforeChange = this.handleBeforeChange.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.handleCursorActivity = this.handleCursorActivity.bind(this)
  }

  public handleBeforeChange(editor: Editor, diff: EditorChange, value: string) {
    this.setState({ template: value, scope: toScope(value) })
    localforage.setItem<string>('template', value)
  }

  public handleChange(editor: Editor) {
    // ...
  }

  public handleCursorActivity(editor: Editor) {
    // Clear previous marks.
    this.state.marks.forEach(mark => mark.clear())
    const cursor = posToPoint(editor.getDoc().getCursor())
    this.setState({
      cursor,
      marks: [],
    })

    if (this.state.scope instanceof scopes.Root) {
      const local =
        localScopeAtPosition(this.state.scope, this.state.cursor) ||
        this.state.scope
      const from = pointToPos(local.node.start())
      const to = pointToPos(local.node.end())
      const mark = editor.getDoc().markText(from, to, { className: 'text-marker-red' })
      this.setState({ marks: [mark] })
    }
  }

  public render() {
    return (
      <React.Fragment>
        <div id="left">
          <CodeMirror
            value={this.state.template}
            onBeforeChange={this.handleBeforeChange}
            onChange={this.handleChange}
            onCursorActivity={this.handleCursorActivity}
            options={{ lineNumbers: true }}
          />
        </div>
        <div id="right">
          <pre>
            {this.state.scope instanceof scopes.Root ? (
              <FormattedScope
                scope={this.state.scope}
                cursor={this.state.cursor}
              />
            ) : (
              this.state.scope.message
            )}
          </pre>
        </div>
      </React.Fragment>
    )
  }
}

interface FormattedScopeProps {
  scope: scopes.Root
  cursor: { line: number; column: number }
}

class FormattedScope extends React.PureComponent<FormattedScopeProps> {
  public render() {
    const local =
      localScopeAtPosition(this.props.scope, this.props.cursor) ||
      this.props.scope
    const chain = scopeChain(local).reverse()
    return (
      <pre>
        ({this.props.cursor.line}:{this.props.cursor.column})<br />
        {chain
          .map((scope, i) => `${Array(i + 1).join('  ')}${scope.toString()}`)
          .join('\n')}
      </pre>
    )
  }
}

const posToPoint = (pos: { line: number; ch: number }): lexer.Point => {
  return {
    line: pos.line + 1,
    column: pos.ch + 1,
  }
}

const pointToPos = (point: lexer.Point) => {
  return {
    line: point.line - 1,
    ch: point.column - 1,
  }
}

const pointBefore = (a: lexer.Point, b: lexer.Point): boolean => {
  if (a.line > b.line) {
    return false
  } else if (a.line === b.line) {
    return a.column <= b.column
  } else {
    return true
  }
}

const pointAfter = (a: lexer.Point, b: lexer.Point): boolean => {
  if (a.line < b.line) {
    return false
  } else if (a.line === b.line) {
    return a.column > b.column
  } else {
    return true
  }
}

const localScopeAtPosition = (
  scope: scopes.Scope,
  point: lexer.Point
): scopes.Scope | null => {
  const start = scope.node.start()
  const end = scope.node.end()
  if (pointBefore(start, point) && pointAfter(end, point)) {
    for (const child of scope.children) {
      const found = localScopeAtPosition(child, point)
      if (found) {
        return found
      }
    }
    return scope
  } else {
    return null
  }
}

const scopeChain = (scope: scopes.Scope): scopes.Scope[] => {
  if (scope instanceof scopes.ChildScope) {
    return [scope, ...scopeChain(scope.parent)]
  } else {
    return [scope]
  }
}

localforage.getItem<string | null>('template').then(template => {
  ReactDOM.render(
    <App initialTemplate={template || DEFAULT_TEMPLATE} />,
    document.querySelector('#main')
  )
})
