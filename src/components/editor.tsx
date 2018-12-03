// 3rd party libraries.
import * as React from 'react'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { EditorConfiguration, Pass } from 'codemirror'

// CodeMirror modes.
require('../mode')
require('codemirror/mode/xml/xml')

interface Props {
  initialTemplate: string
  onChange: (template: string) => void
}

interface State {
  template: string
}

export default class Editor extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    // Initialize state.
    this.state = {
      template: this.props.initialTemplate,
    }

    // Bind component modules.
    this.onBeforeChange = this.onBeforeChange.bind(this)
  }

  private onBeforeChange(_editor: any, _diff: any, template: string) {
    this.setState({ template })
    this.props.onChange(template)
  }

  public render() {
    return (
      <CodeMirror
        value={this.state.template}
        onBeforeChange={this.onBeforeChange}
        options={{
          // Color, syntax highlighting, and layout options.
          lineNumbers: true,
          mode: 'template',
          theme: 'blackboard',

          // Indentation and tab handling options.
          extraKeys: {
            'Shift-Tab': 'indentLess',
            Tab: cm => {
              if (cm.getDoc().getSelection() === '') {
                cm.getDoc().replaceSelection('  ')
              } else {
                return Pass
              }
            },
          },
          indentUnit: 2,
          indentWithTabs: false,
          tabSize: 2,
        }}
      />
    )
  }
}
