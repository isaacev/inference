// 3rd party libraries.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as localforage from 'localforage'

// App libraries.
import { parse, scope, error } from './analysis'
import { DEFAULT_TEMPLATE } from './default'

// App components.
import Editor from './components/editor'
import ErrorReport from './components/error-report'
import Form from './components/form'

type ScopeOrErrors = scope.Root | error.TemplateError[]

interface Props {
  template: string
  onChange: (template: string) => void
}

interface State {
  template: string
  analysis: ScopeOrErrors
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

  private handleChange(template: string) {
    this.setState({ template, analysis: toAnalysis(template) })
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
              errors={this.state.analysis}
            />
          )}
        </div>
      </>
    )
  }
}

const toAnalysis = (template: string): ScopeOrErrors => {
  try {
    const [errs, stmts] = parse(template)
    if (errs.length > 0) {
      return errs
    } else {
      return scope.infer(stmts)
    }
  } catch (err) {
    if (err instanceof error.TemplateError) {
      return [err]
    } else {
      throw err
    }
  }
}

const initialLoad = (template: string | null) => {
  if (template === null) {
    template = DEFAULT_TEMPLATE
  }
  const app = <App template={template} onChange={updateStorage} />
  const elem = document.querySelector('#main')
  ReactDOM.render(app, elem)
}

const updateStorage = (template: string) => {
  localforage.setItem('template', template)
}

localforage.getItem<string>('template').then(initialLoad)
