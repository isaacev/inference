// 3rd party libraries.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { Editor, EditorConfiguration, EditorChange } from 'codemirror'
import * as localforage from 'localforage'

// App libraries.
import { Point } from './points'
import * as paths from './paths'
import * as grammar from './grammar'
import { scope, types } from './semantics'

const CODEMIRROR_OPTIONS: EditorConfiguration = {
  lineNumbers: true,
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
  public render() {
    return (
      <div id="error-message">
        <h2 className="headline">Syntax error</h2>
      </div>
    )
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
