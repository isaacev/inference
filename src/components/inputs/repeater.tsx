// 3rd party libraries.
import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/pro-regular-svg-icons'

// App libraries.
import { types, paths } from '../../analysis'

// App components.
import Any from './any'
import Wrapper from './wrapper'

interface Props {
  path: paths.Path
  type: types.List
  readonly?: boolean
}

interface State {
  count: number
}

export default class Repeater extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      count: 0,
    }
  }

  public render() {
    if (this.state.count <= 0) {
      const path = this.props.path.concat(new paths.Index(0))
      const type = this.props.type.element
      return (
        <Wrapper path={this.props.path} readonly={this.props.readonly}>
          <div className="group group-repeater">
            <div className="instance">
              <InstanceControls />
              <div className="inputs">
                <Any path={path} type={type} readonly={this.props.readonly} />
              </div>
            </div>
          </div>
        </Wrapper>
      )
    }

    return (
      <Wrapper path={this.props.path} readonly={this.props.readonly}>
        <div className="group group-repeater">
          {repeat(this.state.count, i => {
            const path = this.props.path.concat(new paths.Index(i))
            const type = this.props.type.element
            return (
              <div className="instance" key={i}>
                <InstanceControls />
                <div className="inputs">
                  <Any path={path} type={type} />
                </div>
              </div>
            )
          })}
        </div>
      </Wrapper>
    )
  }
}

function InstanceControls() {
  return (
    <div className="controls">
      <button className="delete">
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  )
}

function repeat<T>(num: number, fn: (num: number) => T): T[] {
  const acc = [] as T[]
  for (let i = 0; i < num; i++) {
    acc.push(fn(i))
  }
  return acc
}
