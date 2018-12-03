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
var ReactDOM = require("react-dom");
var localforage = require("localforage");
// App libraries.
var analysis_1 = require("./analysis");
// App components.
var editor_1 = require("./components/editor");
var error_report_1 = require("./components/error-report");
var form_1 = require("./components/form");
var App = /** @class */ (function (_super) {
    __extends(App, _super);
    function App(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            template: _this.props.template,
            analysis: toAnalysis(_this.props.template)
        };
        // Bind methods to this context.
        _this.handleChange = _this.handleChange.bind(_this);
        return _this;
    }
    App.prototype.handleChange = function (template) {
        this.setState({ template: template, analysis: toAnalysis(template) });
        this.props.onChange(template);
    };
    App.prototype.render = function () {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { id: "left" },
                React.createElement(editor_1["default"], { initialTemplate: this.props.template, onChange: this.handleChange })),
            React.createElement("div", { id: "right" }, this.state.analysis instanceof analysis_1.scope.Root ? (React.createElement(form_1["default"], { type: this.state.analysis.context })) : (React.createElement(error_report_1["default"], { template: this.state.template, errors: this.state.analysis })))));
    };
    return App;
}(React.Component));
var toAnalysis = function (template) {
    try {
        var _a = analysis_1.parse(template), errs = _a[0], stmts = _a[1];
        if (errs.length > 0) {
            return errs;
        }
        else {
            return analysis_1.scope.infer(stmts);
        }
    }
    catch (err) {
        if (err instanceof analysis_1.error.TemplateError) {
            return [err];
        }
        else {
            throw err;
        }
    }
};
var initialLoad = function (template) {
    var app = React.createElement(App, { template: template, onChange: updateStorage });
    var elem = document.querySelector('#main');
    ReactDOM.render(app, elem);
};
var updateStorage = function (template) {
    localforage.setItem('template', template);
};
localforage.getItem('template').then(initialLoad);
