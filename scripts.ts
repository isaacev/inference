import * as CodeMirror from 'codemirror'
import * as localforage from 'localforage'
import { DEFAULT_TEMPLATE } from './examples'
import { toTokens } from './lexer'
import { toTree } from './parser'

const left = document.querySelector('#editor') as HTMLTextAreaElement | null
const right = document.querySelector('#right pre') as HTMLPreElement | null

if (!left || !right) {
  throw new Error('unable to load elements')
}

const ed = CodeMirror.fromTextArea(left, { lineNumbers: true })

ed.on('change', () => {
  const val = ed.getValue()
  localforage.setItem<string>('template', val)

  try {
    const toks = toTokens(val)
    const tree = toTree(toks)
    right.innerText = JSON.stringify(tree, null, '  ')
  } catch (err) {
    right.innerText = err
  }
})

localforage
  .getItem<string | null>('template')
  .then(res => ed.setValue(res === null ? DEFAULT_TEMPLATE : res))
  .catch(err => {
    console.error(err)
    ed.setValue(DEFAULT_TEMPLATE)
  })
