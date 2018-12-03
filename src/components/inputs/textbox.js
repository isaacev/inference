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
// App libraries.
var analysis_1 = require("../../analysis");
// App components.
var wrapper_1 = require("./wrapper");
var Textbox = /** @class */ (function (_super) {
    __extends(Textbox, _super);
    function Textbox() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Textbox.prototype.render = function () {
        if (this.props.type instanceof analysis_1.types.StrValue) {
            return (React.createElement(wrapper_1["default"], { path: this.props.path, readonly: this.props.readonly },
                React.createElement("input", { id: this.props.path.toString(), type: "text", placeholder: this.props.type.value, disabled: true })));
        }
        return (React.createElement(wrapper_1["default"], { path: this.props.path, readonly: this.props.readonly },
            React.createElement("input", { id: this.props.path.toString(), type: "text", placeholder: this.props.type.toString(), disabled: this.props.readonly })));
    };
    return Textbox;
}(React.Component));
exports["default"] = Textbox;
