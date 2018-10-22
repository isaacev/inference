// 3rd party libraries.
import * as React from 'react'

// App libraries.
import * as grammar from '../grammar'
import { scope } from '../semantics'

// Components.
import ErrorReport from './error-report'

interface Props {
  model: scope.Root
}

interface State {
  // ...
}

export default class Form extends React.Component<Props, State> {
  public render() {
    return (
      <div className="form">
        <h1>form</h1>
        <p><code>{this.props.model.toString()}</code></p>
      </div>
    )
  }
}
