// 3rd party libraries.
import * as React from 'react'

// App libraries.
import Path from '~/paths'
import Field from '~/paths/segments/field'
import Type from '~/types'
import Unknown from '~/types/unknown'
import Dict from '~/types/dict'
import List from '~/types/list'
import Tuple from '~/types/tuple'
import Str from '~/types/str'
import Num from '~/types/num'
import Bool from '~/types/bool'

// App components.
import Textbox from '~/components/inputs/textbox'
import Repeater from '~/components/inputs/repeater'
import Checkbox from '~/components/inputs/checkbox'
import { StaticOffset } from '~/paths/segments/offset'

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
    } else if (this.props.type instanceof List) {
      return (
        <Repeater
          path={this.props.path}
          type={this.props.type}
          readonly={this.props.readonly}
        />
      )
    } else if (this.props.type instanceof Tuple) {
      return this.props.type.members.map((member, i) => {
        return (
          <Any
            key={i}
            path={this.props.path.concat(new StaticOffset(i))}
            type={member}
            readonly={this.props.readonly}
          />
        )
      })
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
