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
  CodeMirror.defineSimpleMode('venture-meta', {
    start: [{ regex: /\{\{/, push: 'venture', token: 'tag' }],
    venture: [
      { regex: /\}\}/, pop: true, token: 'tag' },

      // Block keywords.
      { regex: /[\#\:\/][a-z]+/, token: 'keyword' },

      // Fields
      { regex: /((\.\w+)+)|\./i, token: 'meta' },

      // Types
      { regex: /\w+/, token: 'variable' },
    ],
  })

  CodeMirror.defineMode('venture', (config, parserConfig) => {
    const meta = CodeMirror.getMode(config, 'venture-meta')
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
