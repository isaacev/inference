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
// App components.
var any_1 = require("./any");
var wrapper_1 = require("./wrapper");
var Choice = /** @class */ (function (_super) {
    __extends(Choice, _super);
    function Choice(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            checked: undefined
        };
        return _this;
    }
    Choice.prototype.render = function () {
        var _this = this;
        var checked = this.state.checked === undefined ? 0 : this.state.checked;
        return (React.createElement(wrapper_1["default"], { path: this.props.path, readonly: this.props.readonly },
            React.createElement("div", { className: "choices" }, this.props.type.branches.map(function (branch, i) {
                var isChecked = i === checked;
                return (React.createElement("div", { className: "choice", key: i },
                    React.createElement("div", { className: "choice-selector", onClick: function () { return _this.setState({ checked: i }); } },
                        React.createElement("input", { type: "radio", id: _this.props.type.toString(), name: _this.props.path.toString(), checked: isChecked, onChange: function () { return _this.setState({ checked: i }); } })),
                    React.createElement("div", { className: "choice-inputs" },
                        React.createElement(any_1["default"], { path: _this.props.path, type: branch, readonly: !isChecked }))));
            }))));
    };
    return Choice;
}(React.Component));
exports["default"] = Choice;
