// 3rd party libraries.
import * as React from 'react'

// App libraries.
import { types, paths } from '../../analysis'

// App components.
import Wrapper from './wrapper'

interface Props {
  path: paths.Path
  type: types.Type
  readonly?: boolean
}

export default class Textbox extends React.Component<Props> {
  public render() {
    if (this.props.type instanceof types.StrValue) {
      return (
        <Wrapper path={this.props.path} readonly={this.props.readonly}>
          <input
            id={this.props.path.toString()}
            type="text"
            placeholder={this.props.type.value}
            disabled={true}
          />
        </Wrapper>
      )
    }

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
