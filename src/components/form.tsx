// 3rd party libraries.
import * as React from 'react'

// App libraries.
import { types } from '../semantics'
import * as paths from '../paths'

// Components.
import Any from './inputs/any'

interface Props {
  type: types.Type
}

export default class Form extends React.Component<Props> {
  public render() {
    return (
      <form className="form">
        <Any path={new paths.Path()} type={this.props.type} />
      </form>
    )
  }
}
