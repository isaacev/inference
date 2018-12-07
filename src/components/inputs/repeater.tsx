// 3rd party libraries.
import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/pro-regular-svg-icons/faTimes'

// App libraries.
import { List } from '../../analysis/types/types'
import { Path, Index } from '../../analysis/types/paths'
import { AtLeast, NumPredicate } from '../../analysis/types/predicates'

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
    this.state = {
      count: getMinLength(props.type.length),
    }
  }

  public static getDerivedStateFromProps(props: Props, state: State) {
    const minCount = getMinLength(props.type.length)
    if (minCount !== state.count) {
      return { count: minCount }
    } else {
      return null
    }
  }

  public render() {
    return (
      <Wrapper path={this.props.path} readonly={this.props.readonly}>
        <div className="group group-repeater">
          {repeat(Math.max(this.state.count, 1), i => {
            const path = this.props.path.concat(new Index(i))
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

const getMinLength = (pred: NumPredicate): number => {
  if (pred instanceof AtLeast) {
    return pred.min
  } else {
    return 0
  }
}
