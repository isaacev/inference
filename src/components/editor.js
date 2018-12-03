"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
// 3rd party libraries.
var React = require("react");
var react_codemirror2_1 = require("react-codemirror2");
var codemirror_1 = require("codemirror");
// CodeMirror modes.
require('../mode');
require('codemirror/mode/xml/xml');
var Editor = /** @class */ (function (_super) {
    __extends(Editor, _super);
    function Editor(props) {
        var _this = _super.call(this, props) || this;
        // Initialize state.
        _this.state = {
            template: _this.props.initialTemplate
        };
        // Bind component modules.
        _this.onBeforeChange = _this.onBeforeChange.bind(_this);
        return _this;
    }
    Editor.prototype.onBeforeChange = function (_editor, _diff, template) {
        this.setState({ template: template });
        this.props.onChange(template);
    };
    Editor.prototype.render = function () {
        return (React.createElement(react_codemirror2_1.Controlled, { value: this.state.template, onBeforeChange: this.onBeforeChange, options: {
                // Color, syntax highlighting, and layout options.
                lineNumbers: true,
                mode: 'template',
                theme: 'blackboard',
                // Indentation and tab handling options.
                extraKeys: {
                    'Shift-Tab': 'indentLess',
                    Tab: function (cm) {
                        if (cm.getDoc().getSelection() === '') {
                            cm.getDoc().replaceSelection('  ');
                        }
                        else {
                            return codemirror_1.Pass;
                        }
                    }
                },
                indentUnit: 2,
                indentWithTabs: false,
                tabSize: 2
            } }));
    };
    return Editor;
}(React.Component));
exports["default"] = Editor;
