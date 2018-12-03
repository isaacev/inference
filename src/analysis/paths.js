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
var paths;
(function (paths) {
    var Segment = /** @class */ (function () {
        function Segment() {
        }
        return Segment;
    }());
    paths.Segment = Segment;
    var Field = /** @class */ (function (_super) {
        __extends(Field, _super);
        function Field(name) {
            var _this = _super.call(this) || this;
            _this.name = name;
            return _this;
        }
        Field.prototype.equalTo = function (other) {
            return other instanceof Field && other.name === this.name;
        };
        Field.prototype.toJSON = function () {
            return {
                typ: 'field',
                name: this.name
            };
        };
        Field.prototype.toString = function () {
            return '.' + this.name;
        };
        return Field;
    }(Segment));
    paths.Field = Field;
    var Index = /** @class */ (function (_super) {
        __extends(Index, _super);
        function Index(index) {
            var _this = _super.call(this) || this;
            _this.index = index;
            return _this;
        }
        Index.prototype.hasIndex = function () {
            return typeof this.index === 'number';
        };
        Index.prototype.equalTo = function (other) {
            if (other instanceof Index) {
                return this.index === other.index;
            }
            else {
                return false;
            }
        };
        Index.prototype.toString = function () {
            if (this.hasIndex()) {
                return "[" + this.index + "]";
            }
            else {
                return '[]';
            }
        };
        Index.prototype.toJSON = function () {
            return {
                typ: 'index'
            };
        };
        return Index;
    }(Segment));
    paths.Index = Index;
    var Branch = /** @class */ (function (_super) {
        __extends(Branch, _super);
        function Branch(branch) {
            var _this = _super.call(this) || this;
            _this.branch = branch;
            return _this;
        }
        Branch.prototype.equalTo = function (other) {
            if (other instanceof Branch) {
                return this.branch === other.branch;
            }
            else {
                return false;
            }
        };
        Branch.prototype.toString = function () {
            return "|" + this.branch + "|";
        };
        Branch.prototype.toJSON = function () {
            return {
                typ: 'branch',
                branch: this.branch
            };
        };
        return Branch;
    }(Segment));
    paths.Branch = Branch;
    var Path = /** @class */ (function () {
        function Path(segments) {
            if (segments === void 0) { segments = []; }
            this.segments = segments;
        }
        Path.fromString = function (path) {
            if (path === '.') {
                return new Path();
            }
            else if (/^(\.[a-z]+)+$/i.test(path)) {
                return new Path(path
                    .split('.')
                    .slice(1)
                    .map(function (f) { return new Field(f); }));
            }
            else {
                throw new Error("illegal path: \"" + path + "\"");
            }
        };
        Path.fromFields = function (fields) {
            if (fields.length === 0) {
                return new Path();
            }
            else {
                return new Path(fields.map(function (f) { return new Field(f.replace(/^\./, '')); }));
            }
        };
        Path.prototype.length = function () {
            return this.segments.length;
        };
        Path.prototype.head = function () {
            if (this.length() === 0) {
                return null;
            }
            else {
                return this.segments[0];
            }
        };
        Path.prototype.rest = function () {
            return new Path(this.segments.slice(1));
        };
        Path.prototype.tail = function () {
            if (this.length() === 0) {
                return null;
            }
            else {
                return this.segments[this.segments.length - 1];
            }
        };
        Path.prototype.hasHead = function (path) {
            var _this = this;
            if (path.length() > this.length()) {
                return false;
            }
            else {
                return path.segments.every(function (seg, i) { return seg.equalTo(_this.segments[i]); });
            }
        };
        Path.prototype.relativeTo = function (path) {
            if (this.hasHead(path)) {
                return new Path(this.segments.slice(path.length()));
            }
            else {
                return this;
            }
        };
        Path.prototype.concat = function (append) {
            if (append instanceof Segment) {
                return new Path(this.segments.concat(append));
            }
            else {
                return new Path(this.segments.concat(append.segments));
            }
        };
        Path.prototype.toLabel = function () {
            var tail = this.tail();
            if (tail !== null && tail instanceof Field) {
                return tail.name;
            }
            else {
                return '';
            }
        };
        Path.prototype.toString = function () {
            if (this.length() === 0) {
                return '.';
            }
            else {
                return this.segments.map(function (s) { return s.toString(); }).join('');
            }
        };
        return Path;
    }());
    paths.Path = Path;
})(paths = exports.paths || (exports.paths = {}));
