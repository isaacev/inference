// 3rd party libraries.
import * as React from 'react'

// App libraries.
import { Type, StrValue } from '../../analysis/types/types'
import { Path } from '../../analysis/types/paths'

// App components.
import Wrapper from './wrapper'

interface Props {
  path: Path
  type: Type
  readonly?: boolean
}

export default class Textbox extends React.Component<Props> {
  public render() {
    if (this.props.type instanceof StrValue) {
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
