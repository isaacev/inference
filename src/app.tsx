// 3rd party libraries.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as localforage from 'localforage'

// App libraries.
import { parse } from './analysis/syntax/normalize'
import { solve } from './analysis/solver/solve'
import { Type } from './analysis/types/types'
import { DEFAULT_TEMPLATE } from './default'

// App components.
import Editor from './components/editor'
import {
  TemplateError,
  TemplateErrorCollection,
} from './analysis/syntax/errors'

interface Props {
  template: string
  onChange: (template: string) => void
}

interface State {
  template: string
}

class App extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      template: this.props.template,
    }

    // Bind methods to this context.
    this.handleChange = this.handleChange.bind(this)
    console.log(getSolution(this.props.template))
  }

  private handleChange(template: string) {
    this.props.onChange(template)
    this.setState({
      template,
    })
    console.log(getSolution(template))
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
        <div id="right" />
      </>
    )
  }
}

const getSolution = (tmpl: string): Type | TemplateErrorCollection => {
  try {
    return solve(parse(tmpl))
  } catch (err) {
    if (err instanceof TemplateErrorCollection) {
      return err
    } else if (err instanceof TemplateError) {
      return new TemplateErrorCollection([err])
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
