// 3rd party libraries.
import * as React from 'react'

// App libraries.
import { types, paths } from '../../analysis'

// App components.
import Any from './any'
import Wrapper from './wrapper'

interface Props {
  path: paths.Path
  type: types.Or
  readonly?: boolean
}

interface State {
  checked?: number
}

export default class Choice extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      checked: undefined,
    }
  }

  public render() {
    const checked = this.state.checked === undefined ? 0 : this.state.checked
    return (
      <Wrapper path={this.props.path} readonly={this.props.readonly}>
        <div className="choices">
          {this.props.type.branches.map((branch, i) => {
            const isChecked = i === checked
            return (
              <div className="choice" key={i}>
                <div
                  className="choice-selector"
                  onClick={() => this.setState({ checked: i })}
                >
                  <input
                    type="radio"
                    id={this.props.type.toString()}
                    name={this.props.path.toString()}
                    checked={isChecked}
                    onChange={() => this.setState({ checked: i })}
                  />
                </div>
                <div className="choice-inputs">
                  <Any
                    path={this.props.path}
                    type={branch}
                    readonly={!isChecked}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Wrapper>
    )
  }
}
