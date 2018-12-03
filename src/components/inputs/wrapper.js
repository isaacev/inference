"use strict";
exports.__esModule = true;
// 3rd party libraries.
var React = require("react");
var classnames_1 = require("classnames");
exports["default"] = (function (props) {
    return (React.createElement("div", { className: classnames_1["default"]('group', { disabled: props.readonly }) },
        React.createElement("label", { htmlFor: props.path.toString() }, props.path.toLabel()),
        props.children));
});
