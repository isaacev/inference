import * as React from 'react'
import TemplateError from '~/errors'
import { Constraint } from '~/solver/constraints'
import Form from '~/components/form'
import Report from '~/components/report'
import Type from '~/types'

type Props =
  | { mode: 'error'; error: TemplateError; constraints?: Constraint[] }
  | { mode: 'okay'; solution: Type; constraints: Constraint[] }

interface State {
  // empty
}

export default class Right extends React.Component<Props, State> {
  public render() {
    if (this.props.mode === 'error') {
      return (
        <div id="right">
          <div className="report-container">
            <Report {...this.props.error.report} />
          </div>

          {this.props.constraints && (
            <ConstraintTable constraints={this.props.constraints} />
          )}
        </div>
      )
    }

    return (
      <div id="right">
        <Form type={this.props.solution} />
        <ConstraintTable constraints={this.props.constraints} />
      </div>
    )
  }
}

const ConstraintTable = (props: { constraints: Constraint[] }) => (
  <table className="constraints-table">
    <thead>
      <tr>
        <th className="paths">Path</th>
        <th className="types">Type</th>
        <th className="origins">Origin</th>
      </tr>
    </thead>
    <tbody>
      {props.constraints.map(({ path, atomicType: type, origin }, index) => {
        return (
          <tr key={index}>
            <td>{path.toString()}</td>
            <td>{type.toString()}</td>
            <td>{`(${origin.start.line}:${origin.start.column})`}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
)
