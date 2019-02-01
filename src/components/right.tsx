import * as React from 'react'
import TemplateError from '~/errors'
import { Constraint } from '~/solver/constraints'
import Report from '~/components/report'

type Props =
  | { mode: 'error'; error: TemplateError; constraints?: Constraint[] }
  | { mode: 'okay'; constraints: Constraint[] }

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
        <ConstraintTable constraints={this.props.constraints} />
      </div>
    )
  }
}

const ConstraintTable = (props: { constraints: Constraint[] }) => (
  <table>
    <thead>
      <tr>
        <th>Path</th>
        <th>Atomic Type</th>
        <th>Origin</th>
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
