// 3rd party libraries.
import * as React from 'react'

// App libraries.
import { types, paths } from '../../analysis'

// App components.
import Textbox from './textbox'
import Choice from './choice'
import Repeater from './repeater'
import Checkbox from './checkbox'

interface Props {
  path: paths.Path
  type: types.Type
  readonly?: boolean
}

export default class Any extends React.Component<Props> {
  public render() {
    if (this.props.type instanceof types.Dict) {
      return this.props.type.pairs.map((pair, i) => {
        return (
          <Any
            key={i}
            path={this.props.path.concat(new paths.Field(pair.key))}
            type={pair.value}
            readonly={this.props.readonly}
          />
        )
      })
    } else if (this.props.type instanceof types.Or) {
      return (
        <Choice
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof types.List) {
      return (
        <Repeater
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof types.Num) {
      return 'num'
    } else if (this.props.type instanceof types.Bool) {
      return (
        <Checkbox
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof types.Str) {
      return (
        <Textbox
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof types.Unknown) {
      return 'unknown'
    } else {
      throw new Error(`unknown type: "${this.props.type.toString()}"`)
    }
  }
}
