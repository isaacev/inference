// 3rd party libraries.
import * as React from 'react'
import classnames from 'classnames'

// App libraries.
import Path from '~/paths'

interface Props {
  path: Path
  readonly?: boolean
  children: React.ReactNode
}

export default (props: Props) => {
  return (
    <div className={classnames('group', { disabled: props.readonly })}>
      <label htmlFor={props.path.toString()}>{props.path.toLabel()}</label>
      {props.children}
    </div>
  )
}
