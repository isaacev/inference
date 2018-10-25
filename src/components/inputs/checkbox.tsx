// 3rd party libraries.
import * as React from 'react'

// App libraries.
import * as paths from '../../paths'
import { types } from '../../semantics'

// App components.
import Wrapper from './wrapper'

interface Props {
  path: paths.Path
  type: types.Type
  readonly?: boolean
}

export default class Checkbox extends React.Component<Props> {
  public render() {
    return (
      <Wrapper path={this.props.path} readonly={this.props.readonly}>
        <input
          id={this.props.path.toString()}
          type="checkbox"
          disabled={this.props.readonly}
        />
      </Wrapper>
    )
  }
}
