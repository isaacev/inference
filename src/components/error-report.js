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
var analysis_1 = require("../analysis");
var ErrorReport = /** @class */ (function (_super) {
    __extends(ErrorReport, _super);
    function ErrorReport() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ErrorReport.prototype.render = function () {
        var _this = this;
        return (React.createElement(React.Fragment, null, this.props.errors.map(function (err, index) { return (React.createElement(ErrorMessage, { key: index, template: _this.props.template, error: err })); })));
    };
    return ErrorReport;
}(React.PureComponent));
exports["default"] = ErrorReport;
var ErrorMessage = /** @class */ (function (_super) {
    __extends(ErrorMessage, _super);
    function ErrorMessage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ErrorMessage.prototype.render = function () {
        return (React.createElement("div", { id: "error-message" },
            React.createElement("h2", { className: "headline" }, "Syntax error"),
            React.createElement("h3", null, this.props.error.message),
            this.props.error instanceof analysis_1.error.TemplateError && (React.createElement("pre", { className: "snippet" }, toSnippet(this.props.template, this.props.error.loc)))));
    };
    return ErrorMessage;
}(React.PureComponent));
var LINES_BEFORE = 3;
var LINES_AFTER = 3;
var UnmarkedLine = function (props) { return (React.createElement("span", { className: "line" },
    React.createElement("span", { className: "gutter" },
        props.num.toString().padStart(props.gutterWidth),
        ' | '),
    React.createElement("span", { className: "code" }, props.text))); };
var MarkedLine = function (props) { return (React.createElement("span", { className: "line" },
    React.createElement("span", { className: "gutter" },
        props.num.toString().padStart(props.gutterWidth),
        ' | '),
    React.createElement("span", { className: "code" },
        props.start > 0 ? props.text.slice(0, props.start) : '',
        React.createElement("span", { className: "is-error" }, props.text.slice(props.start, props.end)),
        props.end < props.text.length - 1 ? props.text.slice(props.end) : ''))); };
var toSnippet = function (template, _a) {
    var start = _a.start, end = _a.end;
    // Split template into individual lines, each tagged with the respective line
    // number and starting offset
    var lines = stringToLines(template);
    // Iterate over each line in the template and if it contains an error or is
    // closer to the error than `LINES_BEFORE` or `LINES_AFTER`, include that line
    // in the final snippet
    var includedLines = lines.filter(function (_a) {
        var num = _a.num;
        return num >= start.line - LINES_BEFORE && num <= end.line + LINES_AFTER;
    });
    // For each included line, mark it with which sub-slice should be colored red
    var markedLines = includedLines.map(function (line) {
        var beforeError = line.offset + line.text.length < start.offset;
        var afterError = line.offset > end.offset;
        if (beforeError || afterError) {
            return { indices: null, line: line };
        }
        else {
            var from = Math.max(0, start.offset - line.offset);
            var to = Math.min(line.text.length, end.offset - line.offset);
            return { indices: [from, to], line: line };
        }
    });
    // How many characters should be allocated for the line-number gutter?
    var gutterWidth = Math.max.apply(Math, markedLines.map(function (_a) {
        var line = _a.line;
        return line.num.toString().length;
    }));
    var lineElements = markedLines.map(function (_a) {
        var indices = _a.indices, line = _a.line;
        if (indices === null) {
            return (React.createElement(UnmarkedLine, { num: line.num, gutterWidth: gutterWidth, text: line.text }));
        }
        else {
            return (React.createElement(MarkedLine, { num: line.num, gutterWidth: gutterWidth, text: line.text, start: indices[0], end: indices[1] }));
        }
    });
    return putBetween(lineElements, React.createElement("br", null)).map(addKeys);
};
var stringToLines = function (str, num, offset) {
    if (num === void 0) { num = 1; }
    if (offset === void 0) { offset = 0; }
    return str.split('\n').map(function (text, index) {
        var line = {
            text: text,
            num: num++,
            offset: offset + index
        };
        offset += text.length;
        return line;
    });
};
function putBetween(arr, glue) {
    return arr.reduce(function (acc, elem, i) {
        if (i > 0) {
            return acc.concat(glue, elem);
        }
        else {
            return acc.concat(elem);
        }
    }, []);
}
function addKeys(elem, index) {
    return React.createElement(React.Fragment, { key: index }, elem);
}
