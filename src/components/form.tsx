// 3rd party libraries.
import * as React from 'react'

// App libraries.
import { Type } from '../analysis/types/types'
import { Path } from '../analysis/types/paths'

// Components.
import Any from './inputs/any'

interface Props {
  type: Type
}

export default class Form extends React.Component<Props> {
  public render() {
    return (
      <form className="form">
        <Any path={new Path()} type={this.props.type} />
      </form>
    )
  }
}
