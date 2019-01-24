import * as React from 'react'
import TemplateError from '~/errors'
import { Constraint, toConstraints } from '~/solver/constraints'
import { parse as toStatements } from '~/parser/normalize'
import Left from '~/components/left'
import Right from '~/components/right'
import Path from '~/paths'

interface Props {
  template: string
  onChange: (template: string) => void
}

interface State {
  template: string
  analysis:
    | { mode: 'error'; error: TemplateError }
    | { mode: 'okay'; constraints: Constraint[] }
}

export default class App extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      template: props.template,
      analysis: analyze(props.template),
    }

    this.handleChange = this.handleChange.bind(this)
  }

  private handleChange(newTemplate: string) {
    this.props.onChange(newTemplate)
    this.setState({
      template: newTemplate,
      analysis: analyze(newTemplate),
    })
  }

  public render() {
    return (
      <React.Fragment>
        <Left
          initialTemplate={this.state.template}
          onChange={this.handleChange}
        />
        <Right {...this.state.analysis} />
      </React.Fragment>
    )
  }
}

const analyze = (template: string): State['analysis'] => {
  try {
    return {
      mode: 'okay',
      constraints: toConstraints(toStatements(template), new Path()),
    }
  } catch (err) {
    if (err instanceof TemplateError) {
      return {
        mode: 'error',
        error: err,
      }
    } else {
      throw err
    }
  }
}
