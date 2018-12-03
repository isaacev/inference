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
var textbox_1 = require("./textbox");
var choice_1 = require("./choice");
var repeater_1 = require("./repeater");
var checkbox_1 = require("./checkbox");
var Any = /** @class */ (function (_super) {
    __extends(Any, _super);
    function Any() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Any.prototype.render = function () {
        var _this = this;
        if (this.props.type instanceof analysis_1.types.Dict) {
            return this.props.type.pairs.map(function (pair, i) {
                return (React.createElement(Any, { key: i, path: _this.props.path.concat(new analysis_1.paths.Field(pair.key)), type: pair.value, readonly: _this.props.readonly }));
            });
        }
        else if (this.props.type instanceof analysis_1.types.Or) {
            return (React.createElement(choice_1["default"], { path: this.props.path, type: this.props.type, readonly: this.props.readonly }));
        }
        else if (this.props.type instanceof analysis_1.types.List) {
            return (React.createElement(repeater_1["default"], { path: this.props.path, type: this.props.type, readonly: this.props.readonly }));
        }
        else if (this.props.type instanceof analysis_1.types.Num) {
            return 'num';
        }
        else if (this.props.type instanceof analysis_1.types.Bool) {
            return (React.createElement(checkbox_1["default"], { path: this.props.path, type: this.props.type, readonly: this.props.readonly }));
        }
        else if (this.props.type instanceof analysis_1.types.Str) {
            return (React.createElement(textbox_1["default"], { path: this.props.path, type: this.props.type, readonly: this.props.readonly }));
        }
        else if (this.props.type instanceof analysis_1.types.Unknown) {
            return 'unknown';
        }
        else {
            throw new Error("unknown type: \"" + this.props.type.toString() + "\"");
        }
    };
    return Any;
}(React.Component));
exports["default"] = Any;
