// 3rd party libraries.
import * as React from 'react'

// App libraries.
import Type from '~/types'
import Path from '~/paths'

// App components.
import Wrapper from './wrapper'

interface Props {
  path: Path
  type: Type
  readonly?: boolean
}

export default class Textbox extends React.Component<Props> {
  public render() {
    return (
      <Wrapper path={this.props.path} readonly={this.props.readonly}>
        <input
          id={this.props.path.toString()}
          type="text"
          placeholder={this.props.type.toString()}
          disabled={this.props.readonly}
        />
      </Wrapper>
    )
  }
}
