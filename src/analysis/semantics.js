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
var paths_1 = require("./paths");
var error_1 = require("./error");
var types;
(function (types) {
    var Nil = /** @class */ (function () {
        function Nil() {
        }
        Nil.prototype.accepts = function (that) {
            if (that instanceof Nil) {
                return true;
            }
            else {
                return false;
            }
        };
        Nil.prototype.toJSON = function () {
            return { type: 'nil' };
        };
        Nil.prototype.toString = function () {
            return 'Nil';
        };
        return Nil;
    }());
    types.Nil = Nil;
    var Type = /** @class */ (function () {
        function Type() {
        }
        return Type;
    }());
    types.Type = Type;
    var Unknown = /** @class */ (function (_super) {
        __extends(Unknown, _super);
        function Unknown() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Unknown.prototype.accepts = function (that) {
            return true;
        };
        Unknown.prototype.toJSON = function () {
            return { type: 'unknown' };
        };
        Unknown.prototype.toString = function () {
            return 'Unknown';
        };
        return Unknown;
    }(Type));
    types.Unknown = Unknown;
    var Or = /** @class */ (function (_super) {
        __extends(Or, _super);
        function Or(branches) {
            if (branches === void 0) { branches = []; }
            var _this = _super.call(this) || this;
            _this.branches = branches;
            return _this;
        }
        Or.prototype.accepts = function (that) {
            var _this = this;
            if (that instanceof Or) {
                return that.branches.every(function (b) { return _this.accepts(b); });
            }
            else {
                return this.branches.some(function (b) { return b.accepts(that); });
            }
        };
        Or.prototype.toJSON = function () {
            return { type: 'or', branches: this.branches };
        };
        Or.prototype.toString = function () {
            return "Or(" + this.branches.map(function (b) { return b.toString(); }).join(' ') + ")";
        };
        Or.unify = function (t1, t2) {
            // Hacky and not logically complete.
            if (t1.branches.length === t2.branches.length) {
                return new Or(t1.branches.map(function (b1, i) { return types.unify(b1, t2.branches[i]); }));
            }
            else {
                return t1.branches.length > t2.branches.length ? t1 : t2;
            }
        };
        return Or;
    }(Type));
    types.Or = Or;
    var Dict = /** @class */ (function (_super) {
        __extends(Dict, _super);
        function Dict(pairs) {
            var _this = _super.call(this) || this;
            _this.pairs = pairs;
            return _this;
        }
        Dict.prototype.keys = function () {
            return this.pairs.map(function (pair) { return pair.key; });
        };
        Dict.prototype.hasKey = function (key) {
            return this.pairs.some(function (pair) { return pair.key === key; });
        };
        Dict.prototype.getValue = function (key) {
            for (var _i = 0, _a = this.pairs; _i < _a.length; _i++) {
                var pair = _a[_i];
                if (pair.key === key) {
                    return pair.value;
                }
            }
            return new Unknown();
        };
        Dict.prototype.accepts = function (that) {
            if (that instanceof Dict) {
                return this.pairs.every(function (pair) {
                    return pair.value.accepts(that.getValue(pair.key));
                });
            }
            else {
                return false;
            }
        };
        Dict.prototype.toJSON = function () {
            return { type: 'dict', pairs: this.pairs };
        };
        Dict.prototype.toString = function () {
            return "{ " + this.pairs
                .map(function (pair) { return pair.key + ":" + pair.value + " "; })
                .join('') + "}";
        };
        Dict.merge = function (t1, t2, fn) {
            // Collect all unique keys in both objects.
            var unifiedKeys = t1
                .keys()
                .concat(t2.keys())
                .filter(function (k, i, a) { return i === a.indexOf(k); });
            // For each key, union its associated types.
            var unifiedPairs = unifiedKeys.map(function (key) {
                if (t1.hasKey(key) && t2.hasKey(key)) {
                    return { key: key, value: fn(t1.getValue(key), t2.getValue(key)) };
                }
                else if (t1.hasKey(key)) {
                    return { key: key, value: t1.getValue(key) };
                }
                else {
                    return { key: key, value: t2.getValue(key) };
                }
            });
            return new Dict(unifiedPairs);
        };
        return Dict;
    }(Type));
    types.Dict = Dict;
    var List = /** @class */ (function (_super) {
        __extends(List, _super);
        function List(element) {
            if (element === void 0) { element = new Unknown(); }
            var _this = _super.call(this) || this;
            _this.element = element;
            return _this;
        }
        List.prototype.accepts = function (that) {
            if (that instanceof List) {
                return this.element.accepts(that.element);
            }
            else {
                return false;
            }
        };
        List.prototype.toJSON = function () {
            return { type: 'list', element: this.element };
        };
        List.prototype.toString = function () {
            return "[" + this.element.toString() + "]";
        };
        return List;
    }(Type));
    types.List = List;
    var Str = /** @class */ (function (_super) {
        __extends(Str, _super);
        function Str() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Str.prototype.accepts = function (that) {
            if (that instanceof Str) {
                return true;
            }
            else {
                return false;
            }
        };
        Str.prototype.toJSON = function () {
            return { type: 'str' };
        };
        Str.prototype.toString = function () {
            return 'Str';
        };
        return Str;
    }(Type));
    types.Str = Str;
    var StrValue = /** @class */ (function (_super) {
        __extends(StrValue, _super);
        function StrValue(value) {
            var _this = _super.call(this) || this;
            _this.value = value;
            return _this;
        }
        StrValue.prototype.accepts = function (that) {
            if (that instanceof StrValue) {
                return this.value === that.value;
            }
            else {
                return false;
            }
        };
        StrValue.prototype.toJSON = function () {
            return { type: 'str', value: this.value };
        };
        StrValue.prototype.toString = function () {
            return "\"" + this.value.replace('\n', '\\n').replace('"', '\\"') + "\"";
        };
        return StrValue;
    }(Str));
    types.StrValue = StrValue;
    var Num = /** @class */ (function (_super) {
        __extends(Num, _super);
        function Num() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Num.prototype.accepts = function (that) {
            if (that instanceof Num) {
                return true;
            }
            else {
                return false;
            }
        };
        Num.prototype.toJSON = function () {
            return { type: 'num' };
        };
        Num.prototype.toString = function () {
            return 'Num';
        };
        return Num;
    }(Type));
    types.Num = Num;
    var Bool = /** @class */ (function (_super) {
        __extends(Bool, _super);
        function Bool() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Bool.prototype.accepts = function (that) {
            if (that instanceof Bool) {
                return true;
            }
            else {
                return false;
            }
        };
        Bool.prototype.toJSON = function () {
            return { type: 'bool' };
        };
        Bool.prototype.toString = function () {
            return 'Bool';
        };
        return Bool;
    }(Type));
    types.Bool = Bool;
    var True = /** @class */ (function (_super) {
        __extends(True, _super);
        function True() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        True.prototype.accepts = function (that) {
            if (that instanceof True) {
                return true;
            }
            else {
                return false;
            }
        };
        True.prototype.toJSON = function () {
            return { type: 'true' };
        };
        True.prototype.toString = function () {
            return 'True';
        };
        return True;
    }(Bool));
    types.True = True;
    var False = /** @class */ (function (_super) {
        __extends(False, _super);
        function False() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        False.prototype.accepts = function (that) {
            if (that instanceof False) {
                return true;
            }
            else {
                return false;
            }
        };
        False.prototype.toJSON = function () {
            return { type: 'false' };
        };
        False.prototype.toString = function () {
            return 'False';
        };
        return False;
    }(Bool));
    types.False = False;
    types.followPath = function (path, ctx) {
        var first = path.head();
        if (first === null) {
            return ctx;
        }
        else if (first instanceof paths_1.paths.Field) {
            if (ctx instanceof Unknown) {
                return new Unknown();
            }
            else if (ctx instanceof Dict) {
                return types.followPath(path.rest(), ctx.getValue(first.name));
            }
            else {
                throw new error_1.error.TypeError("no field \"" + first.name + "\" on type " + ctx.toString());
            }
        }
        else if (first instanceof paths_1.paths.Index) {
            if (ctx instanceof Unknown) {
                return new Unknown();
            }
            else if (ctx instanceof List) {
                return types.followPath(path.rest(), ctx.element);
            }
            else {
                throw new error_1.error.TypeError("no index on type " + ctx.toString());
            }
        }
        else if (first instanceof paths_1.paths.Branch) {
            if (ctx instanceof Unknown) {
                return new Unknown();
            }
            else if (ctx instanceof Or) {
                return types.followPath(path.rest(), ctx.branches[first.branch] || new Unknown());
            }
            else {
                throw new error_1.error.TypeError("no branches on type " + ctx.toString());
            }
        }
        else {
            throw new error_1.error.TypeError("unknown path segment");
        }
    };
    types.unify = function (t1, t2) {
        if (t1 instanceof Unknown) {
            return t2;
        }
        else if (t2 instanceof Unknown) {
            return t1;
        }
        if (t1 instanceof Dict && t2 instanceof Dict) {
            return Dict.merge(t1, t2, function (t1, t2) { return types.unify(t1, t2); });
        }
        else if (t1 instanceof List && t2 instanceof List) {
            return new List(types.unify(t1.element, t2.element));
        }
        else if (t1 instanceof Or && t2 instanceof Or) {
            return Or.unify(t1, t2);
        }
        if (t1.accepts(t2)) {
            return t1;
        }
        else if (t2.accepts(t1)) {
            return t2;
        }
        else {
            throw new error_1.error.TypeError("cannot unify " + t1 + " and " + t2);
        }
    };
    types.intersect = function (t1, t2) {
        if (t1 instanceof Unknown) {
            return t2;
        }
        else if (t2 instanceof Unknown) {
            return t1;
        }
        if (t1 instanceof Dict && t2 instanceof Dict) {
            return Dict.merge(t1, t2, function (t1, t2) { return types.intersect(t1, t2); });
        }
        else if (t1 instanceof List && t2 instanceof List) {
            return new List(types.intersect(t1.element, t2.element));
        }
        if (t1.accepts(t2)) {
            return t2;
        }
        else if (t2.accepts(t1)) {
            return t1;
        }
        else {
            throw new error_1.error.TypeError("cannot intersect " + t1 + " and " + t2);
        }
    };
    var commonType = function (combine) {
        var rec = function (path, ctx, cons) {
            var first = path.head();
            if (first === null) {
                return combine(ctx, cons);
            }
            else if (first instanceof paths_1.paths.Field) {
                if (ctx instanceof Unknown) {
                    return new Dict([
                        {
                            key: first.name,
                            value: rec(path.rest(), new Unknown(), cons)
                        },
                    ]);
                }
                else if (ctx instanceof Dict) {
                    return combine(ctx, new Dict([
                        {
                            key: first.name,
                            value: rec(path.rest(), ctx.getValue(first.name), cons)
                        },
                    ]));
                }
                else {
                    throw new error_1.error.TypeError("no field \"" + first.name + "\" on type " + ctx);
                }
            }
            else if (first instanceof paths_1.paths.Index) {
                if (ctx instanceof Unknown) {
                    return new List(rec(path.rest(), new Unknown(), cons));
                }
                else if (ctx instanceof List) {
                    return combine(ctx, new List(rec(path.rest(), ctx.element, cons)));
                }
                else {
                    throw new error_1.error.TypeError("no index on type " + ctx);
                }
            }
            else if (first instanceof paths_1.paths.Branch) {
                if (ctx instanceof Unknown) {
                    return new Or([rec(path.rest(), new Unknown(), cons)]);
                }
                else if (ctx instanceof Or) {
                    var branches = ctx.branches.slice();
                    if (branches.length > first.branch) {
                        branches[first.branch] = rec(path.rest(), branches[first.branch] || new Unknown(), cons);
                        return new Or(branches);
                    }
                    else {
                        branches.push(rec(path.rest(), new Unknown(), cons));
                        return new Or(branches);
                    }
                }
                else {
                    throw new error_1.error.TypeError("no branches on type " + ctx);
                }
            }
            else {
                throw new error_1.error.TypeError("unknown path segment");
            }
        };
        return rec;
    };
    types.largestCommonType = commonType(types.unify);
    types.smallestCommonType = commonType(types.intersect);
})(types = exports.types || (exports.types = {}));
var scope;
(function (scope_1) {
    var Scope = /** @class */ (function () {
        function Scope(context) {
            this.context = context;
            this.children = [];
        }
        Scope.prototype.lookup = function (path) {
            return types.followPath(path, this.context);
        };
        return Scope;
    }());
    scope_1.Scope = Scope;
    var Root = /** @class */ (function (_super) {
        __extends(Root, _super);
        function Root() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Root.prototype.constrain = function (path, typ) {
            this.context = types.smallestCommonType(path, this.context, typ);
        };
        Root.prototype.propogate = function (path, typ) {
            this.context = types.largestCommonType(path, this.context, typ);
        };
        Root.prototype.inheritance = function () {
            return [this];
        };
        Root.prototype.toString = function () {
            return "root " + this.context.toString();
        };
        return Root;
    }(Scope));
    scope_1.Root = Root;
    var ChildScope = /** @class */ (function (_super) {
        __extends(ChildScope, _super);
        function ChildScope(parent, path, context) {
            var _this = _super.call(this, context ? context : parent.lookup(path)) || this;
            _this.parent = parent;
            _this.path = path;
            _this.parent.children.push(_this);
            return _this;
        }
        ChildScope.prototype.inheritance = function () {
            return [this].concat(this.parent.inheritance());
        };
        return ChildScope;
    }(Scope));
    scope_1.ChildScope = ChildScope;
    var With = /** @class */ (function (_super) {
        __extends(With, _super);
        function With(parent, path, context) {
            var _this = _super.call(this, parent, path, context) || this;
            _this.parent.constrain(_this.path, new types.Unknown());
            return _this;
        }
        With.prototype.constrain = function (path, typ) {
            this.context = types.smallestCommonType(path, this.context, typ);
            this.parent.constrain(this.path, this.context);
        };
        With.prototype.propogate = function (path, typ) {
            this.context = types.largestCommonType(path, this.context, typ);
            this.parent.constrain(this.path, this.context);
        };
        With.prototype.toString = function () {
            return "with " + this.context.toString();
        };
        return With;
    }(ChildScope));
    scope_1.With = With;
    var Loop = /** @class */ (function (_super) {
        __extends(Loop, _super);
        function Loop(parent, path, context) {
            var _this = this;
            if (context instanceof types.Unknown) {
                _this = _super.call(this, parent, path, new types.Unknown()) || this;
                _this.parent.constrain(_this.path, new types.List());
            }
            else if (context instanceof types.List) {
                _this = _super.call(this, parent, path, context.element) || this;
            }
            else {
                // This branch should throw an error.
                _this = _super.call(this, parent, path, context) || this;
                _this.parent.constrain(_this.path, new types.List());
            }
            return _this;
        }
        Loop.prototype.constrain = function (path, typ) {
            this.context = types.smallestCommonType(path, this.context, typ);
            this.parent.propogate(this.path, new types.List(this.context));
        };
        Loop.prototype.propogate = function (path, typ) {
            this.context = types.largestCommonType(path, this.context, typ);
            this.parent.propogate(this.path, new types.List(this.context));
        };
        Loop.prototype.toString = function () {
            return "loop " + this.context.toString();
        };
        return Loop;
    }(ChildScope));
    scope_1.Loop = Loop;
    var Branch = /** @class */ (function (_super) {
        __extends(Branch, _super);
        function Branch(parent, path, ctx) {
            return _super.call(this, parent, path, ctx) || this;
        }
        Branch.prototype.constrain = function (path, typ) {
            this.context = types.smallestCommonType(path, this.context, typ);
            this.parent.propogate(this.path.concat(path), typ);
        };
        Branch.prototype.propogate = function (path, typ) {
            this.context = types.largestCommonType(path, this.context, typ);
            this.parent.propogate(this.path.concat(path), typ);
        };
        Branch.prototype.toString = function () {
            return "branch " + this.context.toString();
        };
        return Branch;
    }(ChildScope));
    scope_1.Branch = Branch;
    scope_1.infer = function (stmts) {
        var scope = new Root(new types.Unknown());
        stmts.forEach(function (stmt) { return inferStmt(scope, stmt); });
        return scope;
    };
    var inferStmt = function (scope, stmt) {
        try {
            switch (stmt.type) {
                case 'inline':
                    inferInline(scope, stmt);
                    break;
                case 'block':
                    switch (stmt.name) {
                        case 'with':
                            inferWith(scope, stmt);
                            break;
                        case 'loop':
                            inferLoop(scope, stmt);
                            break;
                        case 'match':
                            inferMatch(scope, stmt);
                            break;
                    }
                    break;
            }
        }
        catch (err) {
            throw wrapIfTypeError(stmt.where, err);
        }
    };
    var inferInline = function (scope, stmt) {
        scope.constrain(paths_1.paths.Path.fromFields(stmt.field), new types.Str());
    };
    var inferWith = function (scope, stmt) {
        var subscope = new With(scope, paths_1.paths.Path.fromFields(stmt.field));
        stmt.stmts.forEach(function (stmt) { return inferStmt(subscope, stmt); });
    };
    var inferLoop = function (scope, stmt) {
        var path = paths_1.paths.Path.fromFields(stmt.field);
        var subscope = new Loop(scope, path, scope.lookup(path));
        stmt.stmts.forEach(function (stmt) { return inferStmt(subscope, stmt); });
        // TODO: handle optional {{:empty}} clause
    };
    var inferMatch = function (scope, stmt) {
        var basePath = paths_1.paths.Path.fromFields(stmt.field);
        // Analyze initial case.
        var branchPath = basePath.concat(new paths_1.paths.Branch(0));
        var subscope = new Branch(scope, branchPath, scope.lookup(branchPath));
        stmt.stmts.forEach(function (stmt) { return inferStmt(subscope, stmt); });
        // Analyze additional cases.
        stmt.orClauses.forEach(function (stmts, index) {
            var branchPath = basePath.concat(new paths_1.paths.Branch(index + 1));
            var subscope = new Branch(scope, branchPath, scope.lookup(branchPath));
            stmts.forEach(function (stmt) { return inferStmt(subscope, stmt); });
        });
    };
    var wrapIfTypeError = function (where, err) {
        if (err instanceof error_1.error.TypeError) {
            throw new error_1.error.TemplateTypeError(where, err);
        }
        else {
            throw err;
        }
    };
})(scope = exports.scope || (exports.scope = {}));
