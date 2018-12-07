// 3rd party libraries.
import * as React from 'react'

// App libraries.
import {
  Type,
  Dict,
  Or,
  Tuple,
  List,
  Num,
  Bool,
  Str,
  Unknown,
} from '../../analysis/types/types'
import { Path, Field } from '../../analysis/types/paths'

// App components.
import Textbox from './textbox'
import Choice from './choice'
import Repeater from './repeater'
import Checkbox from './checkbox'

interface Props {
  path: Path
  type: Type
  readonly?: boolean
}

export default class Any extends React.Component<Props> {
  public render() {
    if (this.props.type instanceof Dict) {
      return this.props.type.fields.map((field, i) => {
        return (
          <Any
            key={i}
            path={this.props.path.concat(new Field(field.name))}
            type={field.type}
            readonly={this.props.readonly}
          />
        )
      })
    } else if (this.props.type instanceof Or) {
      return (
        <Choice
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof List) {
      return (
        <Repeater
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof Tuple) {
      return 'tuple'
    } else if (this.props.type instanceof Num) {
      return 'num'
    } else if (this.props.type instanceof Bool) {
      return (
        <Checkbox
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof Str) {
      return (
        <Textbox
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof Unknown) {
      return 'unknown'
    } else {
      throw new Error(`unknown type: "${this.props.type.toString()}"`)
    }
  }
}
