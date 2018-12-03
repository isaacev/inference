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
var React = require("react");
var ReactDOM = require("react-dom");
var classnames_1 = require("classnames");
var react_fontawesome_1 = require("@fortawesome/react-fontawesome");
var free_solid_svg_icons_1 = require("@fortawesome/free-solid-svg-icons");
var Dropdown = /** @class */ (function (_super) {
    __extends(Dropdown, _super);
    function Dropdown(props) {
        var _this = _super.call(this, props) || this;
        _this.state = { shown: false };
        _this.handleAnchorClick = _this.handleAnchorClick.bind(_this);
        return _this;
    }
    Dropdown.prototype.handleAnchorClick = function (event) {
        this.setState({ shown: !this.state.shown });
    };
    Dropdown.prototype.handleOptionClick = function (index) {
        var _this = this;
        return function () {
            _this.setState({ index: index, shown: false });
        };
    };
    Dropdown.prototype.render = function () {
        var _this = this;
        return (React.createElement("div", { className: classnames_1["default"]('form-dropdown', { shown: this.state.shown }) },
            React.createElement("div", { className: "anchor", onClick: this.handleAnchorClick },
                React.createElement("div", { className: "display" },
                    React.createElement("span", null, this.state.index === undefined
                        ? this.props.emptyMessage
                        : this.props.options[this.state.index].label)),
                React.createElement(react_fontawesome_1.FontAwesomeIcon, { className: "caret", icon: this.state.shown ? free_solid_svg_icons_1.faCaretUp : free_solid_svg_icons_1.faCaretDown })),
            React.createElement("div", { className: "float" },
                React.createElement("div", { className: "options" }, this.props.options.map(function (option, i) {
                    return (React.createElement(DropdownOption, { key: i, onClick: _this.handleOptionClick(i) }, option.component));
                })))));
    };
    return Dropdown;
}(React.Component));
var DropdownOption = /** @class */ (function (_super) {
    __extends(DropdownOption, _super);
    function DropdownOption(props) {
        var _this = _super.call(this, props) || this;
        _this.handleClick = _this.handleClick.bind(_this);
        return _this;
    }
    DropdownOption.prototype.handleClick = function (event) {
        event.stopPropagation();
        this.props.onClick();
    };
    DropdownOption.prototype.render = function () {
        return (React.createElement("div", { className: "option", onClick: this.handleClick }, this.props.children));
    };
    return DropdownOption;
}(React.Component));
var comp = (React.createElement(Dropdown, { emptyMessage: "Pick one\u2026", options: [
        { label: 'h1', component: React.createElement("h1", null, "One (1)") },
        { label: 'h2', component: React.createElement("h2", null, "Two (2)") },
        { label: 'h3', component: React.createElement("h3", null, "Three (3)") },
    ] }));
var elem = document.querySelector('main');
ReactDOM.render(comp, elem);
