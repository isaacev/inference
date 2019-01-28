import * as React from 'react'
import TemplateError from '~/errors'
import { Constraint, toConstraints } from '~/solver/constraints'
import { solve } from '~/solver/inference'
import { parse as toStatements } from '~/parser/normalize'
import Left from '~/components/left'
import Right from '~/components/right'
import Type from '~/types'
import Path from '~/paths'

interface Props {
  template: string
  onChange: (template: string) => void
}

interface State {
  template: string
  analysis:
    | { mode: 'error'; error: TemplateError }
    | { mode: 'okay'; constraints: Constraint[]; solution: Type }
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
    const constraints = toConstraints(toStatements(template), new Path())
    const solution = solve(template, constraints)

    return {
      mode: 'okay',
      constraints,
      solution,
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
