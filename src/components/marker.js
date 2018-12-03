"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.markDocument = function (doc, markers) {
    if (locationsOverlap(markers.map(function (m) { return m.location; }))) {
        throw new Error('cannot use overlaping markers');
    }
    // Split document into individual lines, each tagged with the respective line
    // number and starting offset
    var lines = stringToLines(doc);
    // For each line, identify the markers that touch that line and which indices
    // of the line are touched by those markers
    var markedLines = lines.map(function (line) {
        var marks = markers
            .filter(function (mark) { return markerIncludesLine(mark, line); })
            .map(function (_a) {
            var name = _a.name, _b = _a.location, start = _b.start, end = _b.end;
            var from = Math.max(0, start.offset - line.offset);
            var to = Math.min(line.text.length, end.offset - line.offset);
            return { name: name, from: from, to: to };
        });
        return __assign({}, line, { marks: marks });
    });
    return markedLines;
};
var stringToLines = function (str, num, offset) {
    if (num === void 0) { num = 1; }
    if (offset === void 0) { offset = 0; }
    return str.split('\n').map(function (text, index) {
        var line = {
            text: text,
            offset: offset + index,
            lineNum: num++
        };
        offset += text.length;
        return line;
    });
};
var markerIncludesLine = function (marker, line) {
    var markEndsBeforeLine = marker.location.end.offset <= line.offset;
    var markStartsAfterLine = marker.location.start.offset >= line.offset + line.text.length;
    return !markEndsBeforeLine && !markStartsAfterLine;
};
var locationsOverlap = function (locs) {
    return locs.some(function (loc1, index) {
        return locs.slice(index + 1).some(function (loc2) {
            var oneEndsBeforeTwo = loc1.end.offset <= loc2.start.offset;
            var oneStartsAfterTwo = loc1.start.offset >= loc2.end.offset;
            return oneEndsBeforeTwo || oneStartsAfterTwo;
        });
    });
};
