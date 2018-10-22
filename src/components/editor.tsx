// 3rd party libraries.
import * as React from 'react'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { EditorConfiguration, Pass } from 'codemirror'

// CodeMirror modes.
require('../mode')
require('codemirror/mode/xml/xml')

// App libraries.
import * as grammar from '../grammar'
import { scope } from '../semantics'

interface Props {
  initialTemplate: string
  onChange: (template: string, model: scope.Root | grammar.SyntaxError) => void
}

interface State {
  template: string
  model: scope.Root | grammar.SyntaxError
}

export default class Editor extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    // Initialize state.
    this.state = {
      template: this.props.initialTemplate,
      model: buildModel(this.props.initialTemplate),
    }

    // Bind component modules.
    this.onBeforeChange = this.onBeforeChange.bind(this)
  }

  private onBeforeChange(_editor: any, _diff: any, template: string) {
    // Try to generate a valid model from the template.
    const model = buildModel(template)

    // Update the state with the new template and model.
    this.setState({ template, model })

    // Dispatch `onChange` callback.
    this.props.onChange(template, model)
  }

  public render() {
    return (
      <CodeMirror
        value={this.state.template}
        onBeforeChange={this.onBeforeChange}
        options={{
          // Color, syntax highlighting, and layout options.
          lineNumbers: true,
          mode: 'venture',
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

const buildModel = (template: string): scope.Root | grammar.SyntaxError => {
  try {
    const stmts = grammar.parse(template)
    const model = scope.infer(stmts)
    return model
  } catch (err) {
    if (err instanceof grammar.SyntaxError) {
      return err
    } else {
      throw err
    }
  }
}
