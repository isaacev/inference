import * as React from 'react'
import Editor from '~/components/editor'

interface Props {
  initialTemplate: string
  onChange: (newTemplate: string) => void
}

export default class Left extends React.Component<Props> {
  public render() {
    return (
      <div id="left">
        <Editor {...this.props} />
      </div>
    )
  }
}
