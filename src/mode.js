;(function(mod) {
  if (typeof exports === 'object' && typeof module === 'object') {
    // CommonJS
    mod(
      require('codemirror'),
      require('codemirror/addon/mode/simple'),
      require('codemirror/addon/mode/multiplex')
    )
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      'codemirror',
      'codemirror/addon/mode/simple',
      'codemirror/addon/mode/multiplex',
    ], mod)
  } else {
    // Plain browser.
    mod(CodeMirror)
  }
})(function(CodeMirror) {
  CodeMirror.defineSimpleMode('template-meta', {
    start: [{ regex: /\{\{/, push: 'template', token: 'tag' }],
    template: [
      { regex: /\}\}/, pop: true, token: 'tag' },

      // Inline keywords
      { regex: /\>[a-z]+/, token: 'keyword' },

      // Block keywords.
      { regex: /[\#\:\/][a-z]+/, token: 'keyword' },

      // Paths
      { regex: /\.?[a-z]\w*/i, token: 'string' },
      { regex: /\[(\*|\d+)\]/, token: 'atom' },

      // Types
      { regex: /\w+/, token: 'variable' },
    ],
  })

  CodeMirror.defineMode('template', (config, parserConfig) => {
    const meta = CodeMirror.getMode(config, 'template-meta')
    if (!parserConfig || !parserConfig.base) {
      return meta
    } else {
      const base = CodeMirror.getMode(config, parserConfig.base)
      return CodeMirror.multiplexingMode(base, {
        open: '{{',
        close: '}}',
        mode: meta,
        parseDelimiters: true,
      })
    }
  })
})
