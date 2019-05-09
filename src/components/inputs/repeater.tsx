// 3rd party libraries.
import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/pro-regular-svg-icons/faPlus'
import { faMinus } from '@fortawesome/pro-regular-svg-icons/faMinus'

// App libraries.
import List from '~/types/list'
import Path from '~/paths'
import { StaticOffset } from '~/paths/segments/offset'

// App components.
import Any from './any'
import Wrapper from './wrapper'

interface Props {
  path: Path
  type: List
  readonly?: boolean
}

interface State {
  count: number
}

export default class Repeater extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { count: props.type.minLength }
  }

  public static getDerivedStateFromProps(props: Props, state: State) {
    if (props.type.minLength > state.count) {
      return { count: props.type.minLength }
    } else {
      return null
    }
  }

  private incrementCount() {
    this.setState({ count: this.state.count + 1 })
  }

  private decrementCount() {
    this.setState({ count: this.state.count - 1 })
  }

  public render() {
    return (
      <Wrapper path={this.props.path} readonly={this.props.readonly}>
        <div className="group group-repeater">
          <div className="count">
            <button
              type="button"
              disabled={this.state.count - 1 < this.props.type.minLength}
              onClick={() => this.decrementCount()}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <span>{this.state.count}</span>
            <button type="button" onClick={() => this.incrementCount()}>
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
          {repeat(this.state.count, i => {
            const path = this.props.path.concat(new StaticOffset(i))
            const type = this.props.type.element
            return (
              <div className="instance" key={i}>
                <div className="controls">
                  <div className="center">{i + 1}</div>
                  <button type="button" onClick={() => this.incrementCount()}>
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
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

function repeat<T>(num: number, fn: (num: number) => T): T[] {
  const acc = [] as T[]
  for (let i = 0; i < num; i++) {
    acc.push(fn(i))
  }
  return acc
}
