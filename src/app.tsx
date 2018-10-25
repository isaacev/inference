// 3rd party libraries.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as localforage from 'localforage'

// App libraries.
import { SyntaxError, parse } from './grammar'
import { TypeError, scope } from './semantics'

// App components.
import Editor from './components/editor'
import ErrorReport from './components/error-report'
import Form from './components/form'

interface Props {
  template: string
  onChange: (template: string) => void
}

interface State {
  template: string
  analysis: scope.Root | SyntaxError | TypeError
}

class App extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      template: this.props.template,
      analysis: toAnalysis(this.props.template),
    }

    // Bind methods to this context.
    this.handleChange = this.handleChange.bind(this)
  }

  private handleChange(
    template: string,
    analysis: scope.Root | SyntaxError | TypeError
  ) {
    this.setState({ template, analysis })
    this.props.onChange(template)
  }

  public render() {
    return (
      <>
        <div id="left">
          <Editor
            initialTemplate={this.props.template}
            onChange={this.handleChange}
          />
        </div>
        <div id="right">
          {this.state.analysis instanceof scope.Root ? (
            <Form type={this.state.analysis.context} />
          ) : (
            <ErrorReport
              template={this.state.template}
              error={this.state.analysis}
            />
          )}
        </div>
      </>
    )
  }
}

const toAnalysis = (template: string): scope.Root | SyntaxError | TypeError => {
  try {
    const stmts = parse(template)
    return scope.infer(stmts)
  } catch (err) {
    if (err instanceof SyntaxError || err instanceof TypeError) {
      return err
    } else {
      throw err
    }
  }
}

const initialLoad = (template: string) => {
  const app = <App template={template} onChange={updateStorage} />
  const elem = document.querySelector('#main')
  ReactDOM.render(app, elem)
}

const updateStorage = (template: string) => {
  localforage.setItem('template', template)
}

localforage.getItem<string>('template').then(initialLoad)
