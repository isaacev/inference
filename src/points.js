"use strict";
exports.__esModule = true;
var Point = /** @class */ (function () {
    function Point(line, column) {
        this.line = line;
        this.column = column;
    }
    Point.fromPosition = function (pos) {
        return new Point(pos.line + 1, pos.ch + 1);
    };
    Point.prototype.before = function (pt) {
        if (this.line > pt.line) {
            return false;
        }
        else if (this.line === pt.line) {
            return this.column < pt.column;
        }
        else {
            return true;
        }
    };
    Point.prototype.equals = function (pt) {
        return this.line === pt.line && this.column === pt.column;
    };
    Point.prototype.after = function (pt) {
        if (this.line < pt.line) {
            return false;
        }
        else if (this.line === pt.line) {
            return this.column > pt.column;
        }
        else {
            return true;
        }
    };
    Point.prototype.toPosition = function () {
        return {
            line: this.line - 1,
            ch: this.column - 1
        };
    };
    Point.prototype.toJSON = function () {
        return {
            line: this.line,
            column: this.column
        };
    };
    Point.prototype.toString = function () {
        return "(" + this.line + ":" + this.column + ")";
    };
    return Point;
}());
exports.Point = Point;
var Range = /** @class */ (function () {
    function Range(left, right) {
        if (right === void 0) { right = left; }
        this.left = left;
        this.right = right;
    }
    Range.prototype.toJSON = function () {
        return {
            left: this.left,
            right: this.right
        };
    };
    Range.prototype.toString = function () {
        if (this.left.equals(this.right)) {
            return "at " + this.left;
        }
        else {
            return "from " + this.left + " to " + this.right;
        }
    };
    return Range;
}());
exports.Range = Range;
