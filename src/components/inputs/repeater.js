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
var react_fontawesome_1 = require("@fortawesome/react-fontawesome");
var pro_regular_svg_icons_1 = require("@fortawesome/pro-regular-svg-icons");
// App libraries.
var analysis_1 = require("../../analysis");
// App components.
var any_1 = require("./any");
var wrapper_1 = require("./wrapper");
var Repeater = /** @class */ (function (_super) {
    __extends(Repeater, _super);
    function Repeater(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            count: 0
        };
        return _this;
    }
    Repeater.prototype.render = function () {
        var _this = this;
        if (this.state.count <= 0) {
            var path = this.props.path.concat(new analysis_1.paths.Index(0));
            var type = this.props.type.element;
            return (React.createElement(wrapper_1["default"], { path: this.props.path, readonly: this.props.readonly },
                React.createElement("div", { className: "group group-repeater" },
                    React.createElement("div", { className: "instance" },
                        React.createElement(InstanceControls, null),
                        React.createElement("div", { className: "inputs" },
                            React.createElement(any_1["default"], { path: path, type: type, readonly: this.props.readonly }))))));
        }
        return (React.createElement(wrapper_1["default"], { path: this.props.path, readonly: this.props.readonly },
            React.createElement("div", { className: "group group-repeater" }, repeat(this.state.count, function (i) {
                var path = _this.props.path.concat(new analysis_1.paths.Index(i));
                var type = _this.props.type.element;
                return (React.createElement("div", { className: "instance", key: i },
                    React.createElement(InstanceControls, null),
                    React.createElement("div", { className: "inputs" },
                        React.createElement(any_1["default"], { path: path, type: type }))));
            }))));
    };
    return Repeater;
}(React.Component));
exports["default"] = Repeater;
function InstanceControls() {
    return (React.createElement("div", { className: "controls" },
        React.createElement("button", { className: "delete" },
            React.createElement(react_fontawesome_1.FontAwesomeIcon, { icon: pro_regular_svg_icons_1.faTimes }))));
}
function repeat(num, fn) {
    var acc = [];
    for (var i = 0; i < num; i++) {
        acc.push(fn(i));
    }
    return acc;
}
