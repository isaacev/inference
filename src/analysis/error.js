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
var error;
(function (error) {
    var TemplateError = /** @class */ (function () {
        function TemplateError(loc, msg) {
            this.loc = loc;
            this.message = "(" + loc.start.line + ":" + loc.start.column + ") " + msg;
        }
        TemplateError.prototype.toString = function () {
            return this.message;
        };
        return TemplateError;
    }());
    error.TemplateError = TemplateError;
    var TemplateSyntaxError = /** @class */ (function (_super) {
        __extends(TemplateSyntaxError, _super);
        function TemplateSyntaxError() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return TemplateSyntaxError;
    }(TemplateError));
    error.TemplateSyntaxError = TemplateSyntaxError;
    var UnknownBlockError = /** @class */ (function (_super) {
        __extends(UnknownBlockError, _super);
        function UnknownBlockError(blockStmt) {
            var _this = _super.call(this, blockStmt.pos, "unknown '" + blockStmt.open.text + "' block") || this;
            _this.blockStmt = blockStmt;
            return _this;
        }
        return UnknownBlockError;
    }(TemplateSyntaxError));
    error.UnknownBlockError = UnknownBlockError;
    var UnknownClauseError = /** @class */ (function (_super) {
        __extends(UnknownClauseError, _super);
        function UnknownClauseError(clauseNode, blockRule) {
            var _this = _super.call(this, clauseNode.pos, "unknown '" + clauseNode.name.text + "' clause in '" + blockRule.name + "' block") || this;
            _this.clauseNode = clauseNode;
            _this.blockRule = blockRule;
            return _this;
        }
        return UnknownClauseError;
    }(TemplateSyntaxError));
    error.UnknownClauseError = UnknownClauseError;
    var TooManyClausesError = /** @class */ (function (_super) {
        __extends(TooManyClausesError, _super);
        function TooManyClausesError(clauseNode, clauseRule, blockRule) {
            var _this = _super.call(this, clauseNode.pos, "'" + blockRule.name + "' block allows at most one '" + clauseRule.name + "' clause") || this;
            _this.clauseNode = clauseNode;
            _this.clauseRule = clauseRule;
            _this.blockRule = blockRule;
            return _this;
        }
        return TooManyClausesError;
    }(TemplateSyntaxError));
    error.TooManyClausesError = TooManyClausesError;
    var MismatchedClosingTagError = /** @class */ (function (_super) {
        __extends(MismatchedClosingTagError, _super);
        function MismatchedClosingTagError(blockStmt, blockRule) {
            var _this = _super.call(this, blockStmt.close.pos, "expected '" + blockRule.name + "' in closing tag") || this;
            _this.blockStmt = blockStmt;
            _this.blockRule = blockRule;
            return _this;
        }
        return MismatchedClosingTagError;
    }(TemplateSyntaxError));
    error.MismatchedClosingTagError = MismatchedClosingTagError;
    var TemplateTypeError = /** @class */ (function (_super) {
        __extends(TemplateTypeError, _super);
        function TemplateTypeError(loc, err) {
            return _super.call(this, loc, err.message) || this;
        }
        return TemplateTypeError;
    }(TemplateError));
    error.TemplateTypeError = TemplateTypeError;
    var TypeError = /** @class */ (function () {
        function TypeError(message) {
            this.message = message;
        }
        return TypeError;
    }());
    error.TypeError = TypeError;
})(error = exports.error || (exports.error = {}));
