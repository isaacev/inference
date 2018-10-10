import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
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
    }
  }

  public handleChange(newValue: string) {
    this.setState({ template: newValue, scope: toScope(newValue) })
  }

  public handleCursor(where: CodeMirror.Position) {
    this.setState({ cursor: { line: where.line + 1, column: where.ch + 1 } })
  }

  public render() {
    return (
      <React.Fragment>
        <div id="left">
          <CodeMirror
            value={this.state.template}
            onBeforeChange={(_cm, _diff, value) => this.handleChange(value)}
            onCursorActivity={editor => this.handleCursor(editor.getCursor())}
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

ReactDOM.render(
  <App initialTemplate={DEFAULT_TEMPLATE} />,
  document.querySelector('#main')
)
