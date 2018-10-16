// 3rd party libraries.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Controlled as CodeMirror } from 'react-codemirror2'
import {
  Editor,
  EditorChange,
  TextMarker,
  EditorConfiguration,
  TextMarkerOptions,
} from 'codemirror'
import * as localforage from 'localforage'

// App libraries.
import { Point } from './points'
import * as paths from './paths'
import * as grammar from './grammar'
import { TemplateError } from './errors'
import { scope, types } from './semantics'

const CODEMIRROR_OPTIONS: EditorConfiguration = {
  lineNumbers: true,
}

const BLOCK_MARKER_OPTIONS: TextMarkerOptions = {
  className: 'text-marker-red',
}

interface AppProps {
  initialTemplate: string
  onChange: (template: string) => void
}

interface AppState {
  template: string
  cursor: Point
  marker: TextMarker | null
  syntax: grammar.Statements | TemplateError
}

class App extends React.Component<AppProps, AppState> {
  private static parse(tmpl: string): grammar.Statements | TemplateError {
    try {
      return grammar.parse(tmpl)
    } catch (err) {
      if (err instanceof TemplateError) {
        return err
      } else {
        throw err
      }
    }
  }

  private static infer(tree: grammar.Statements): scope.Root | TemplateError {
    try {
      return scope.infer(tree)
    } catch (err) {
      if (err instanceof TemplateError) {
        return err
      } else {
        throw err
      }
    }
  }

  // private static localBlock(cur: Point, tree: grammar.Statements): ast.Node {
  //   const recurse = (cur: Point, node: ast.Node): ast.Node | null => {
  //     if (node instanceof grammar.Statements) {
  //       for (const child of node.children) {
  //         const found = recurse(cur, child)
  //         if (found) {
  //           return found
  //         }
  //       }
  //       return null
  //     } else if (node instanceof ast.BlockAction) {
  //       const nodeStartsBefore = node.range.left.before(cur)
  //       const nodeEndsAfter = node.range.right.after(cur)
  //       if (nodeStartsBefore && nodeEndsAfter) {
  //         for (const child of node.children) {
  //           const found = recurse(cur, child)
  //           if (found) {
  //             return found
  //           }
  //         }
  //         return node
  //       }
  //       return null
  //     } else {
  //       return null
  //     }
  //   }

  //   return recurse(cur, tree) || tree
  // }

  constructor(props: AppProps) {
    super(props)

    // Initialize state.
    const syntax = App.parse(this.props.initialTemplate)
    this.state = {
      template: this.props.initialTemplate,
      cursor: new Point(1, 1),
      marker: null,
      syntax,
    }

    // Bind component methods.
    this.onBeforeChange = this.onBeforeChange.bind(this)
    this.onCursorActivity = this.onCursorActivity.bind(this)
    this.onBlur = this.onBlur.bind(this)
  }

  private onBeforeChange(editor: Editor, diff: EditorChange, tmpl: string) {
    // Update state with new template and syntax tree.
    const syntax = App.parse(tmpl)
    this.setState({
      template: tmpl,
      syntax,
    })

    // Trigger `onChange` callback.
    this.props.onChange(tmpl)
  }

  private onCursorActivity(editor: Editor) {
    // Update state with cursor position.
    const pos = editor.getDoc().getCursor()
    this.setState({
      cursor: new Point(pos.line + 1, pos.ch + 1),
    })

    // Clear the current marker if it exists.
    if (this.state.marker) {
      this.state.marker.clear()
      this.setState({ marker: null })
    }

    // Highlight the current block.
    // if (this.state.syntax instanceof grammar.Statements) {
    //   const block = App.localBlock(this.state.cursor, this.state.syntax)
    //   const from = block.range.left.toPosition()
    //   const to = block.range.right.toPosition()
    //   const marker = editor.getDoc().markText(from, to, BLOCK_MARKER_OPTIONS)
    //   this.setState({ marker })
    // }
  }

  private onBlur() {
    if (this.state.marker) {
      this.state.marker.clear()
      this.setState({ marker: null })
    }
  }

  public render() {
    return (
      <>
        <div id="left">
          <CodeMirror
            value={this.state.template}
            onBeforeChange={this.onBeforeChange}
            onCursorActivity={this.onCursorActivity}
            onBlur={this.onBlur}
            options={CODEMIRROR_OPTIONS}
          />
        </div>
        <div id="right">
          <DebugPanel
            cursor={this.state.cursor}
            syntax={this.state.syntax}
            scope={this.state.scope}
          />
        </div>
      </>
    )
  }
}

interface DebugPanelProps {
  cursor: Point
  scope: scope.Root | TemplateError
  syntax: grammar.Statements | TemplateError
}

class DebugPanel extends React.PureComponent<DebugPanelProps> {
  public render() {
    if (this.props.syntax instanceof TemplateError) {
      return <pre>{this.props.syntax.toString()}</pre>
    } else if (this.props.scope instanceof TemplateError) {
      return <pre>{this.props.scope.toString()}</pre>
    } else {
      return <pre>{this.props.scope.toString()}</pre>
    }
  }
}

localforage.getItem<string>('template').then(tmpl => {
  ReactDOM.render(
    <App
      initialTemplate={tmpl || ''}
      onChange={tmpl => localforage.setItem<string>('template', tmpl)}
    />,
    document.querySelector('#main')
  )
})
