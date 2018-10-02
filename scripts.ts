import * as CodeMirror from 'codemirror'
import { DEFAULT_TEMPLATE } from './examples'
import { toTokens } from './lexer'
import { toTree } from './parser'

const left = document.querySelector('#left #editor') as HTMLTextAreaElement | null
const right = document.querySelector('#right pre') as HTMLPreElement | null

if (!left || !right) {
  throw new Error('unable to load elements')
}

const ed = (window as any).ed = CodeMirror.fromTextArea(left, {
  lineNumbers: true,
})

ed.on('change', () => {
  const val = ed.getValue()
  try {
    const toks = toTokens(val)
    const tree = toTree(toks)
    right.innerText = JSON.stringify(tree, null, '  ')
  } catch (err) {
    right.innerText = err
  }
})

ed.setValue(DEFAULT_TEMPLATE)
