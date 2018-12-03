"use strict";
exports.__esModule = true;
var grammar = require("./grammar");
var error_1 = require("./error");
var BlockRule = /** @class */ (function () {
    function BlockRule(name, clauses, normalize) {
        this.name = name;
        this.clauses = clauses;
        this.normalize = normalize;
    }
    BlockRule.prototype.appliesTo = function (block) {
        return block.open.text === this.name;
    };
    return BlockRule;
}());
exports.BlockRule = BlockRule;
var ClauseRule = /** @class */ (function () {
    function ClauseRule(name, limit) {
        this.name = name;
        this.limit = limit;
    }
    ClauseRule.prototype.appliesTo = function (clause) {
        return clause.name.text === this.name;
    };
    return ClauseRule;
}());
exports.ClauseRule = ClauseRule;
var normField = function (segments) { return segments; };
var normWith = function (block) {
    return {
        type: 'block',
        name: 'with',
        field: normField(block.field),
        stmts: normStmts(block.stmts),
        where: block.pos
    };
};
var normLoop = function (block) {
    return {
        type: 'block',
        name: 'loop',
        field: normField(block.field),
        stmts: normStmts(block.stmts),
        emptyClause: block.clauses.length > 0 ? normStmts(block.clauses[0].stmts) : [],
        where: block.pos
    };
};
var normMatch = function (block) {
    return {
        type: 'block',
        name: 'match',
        field: normField(block.field),
        stmts: normStmts(block.stmts),
        orClauses: block.clauses.map(function (c) { return normStmts(c.stmts); }),
        where: block.pos
    };
};
var BLOCK_RULES = [
    new BlockRule('with', [], normWith),
    new BlockRule('loop', [new ClauseRule('empty', 'one')], normLoop),
    new BlockRule('match', [new ClauseRule('or', 'many')], normMatch),
];
/**
 * By design, the grammar only makes sure that the template conforms to the most
 * basic syntax rules. The grammar does nothing to check if a block name is
 * legal or if the block has the correct clauses. Checks of that kind are
 * performed by this function. The distinction allows for the creation of more
 * specific error messages and even the ability to fix some errors.
 */
exports.parse = function (tmpl) {
    try {
        var basicTree = toBasicTree(tmpl);
        var errs = findErrors(basicTree);
        var stmts = normStmts(basicTree);
        return [errs, stmts];
    }
    catch (err) {
        if (err instanceof error_1.error.TemplateSyntaxError) {
            return [[err], []];
        }
        else {
            throw err;
        }
    }
};
var toBasicTree = function (tmpl) {
    try {
        return grammar.parse(tmpl);
    }
    catch (err) {
        if (err instanceof grammar.SyntaxError) {
            throw new error_1.error.TemplateSyntaxError(err.location, err.message);
        }
        else {
            throw err;
        }
    }
};
var isBlockStmt = function (stmt) {
    return stmt.type === 'block';
};
var findErrors = function (stmts) {
    var errs = [];
    // Check each block node to make sure it:
    // 1. corresponds to a known block form
    // 2. has no internal errors
    stmts.filter(isBlockStmt).forEach(function (blockStmt) {
        var blockRule = BLOCK_RULES.find(function (f) { return f.appliesTo(blockStmt); });
        if (!blockRule) {
            errs.push(new error_1.error.UnknownBlockError(blockStmt));
            // Even though no corresponding block form was found, child blocks
            // and clauses can still be checked for internal errors
            errs.push.apply(errs, findErrors(blockStmt.stmts));
            blockStmt.clauses.forEach(function (clause) {
                errs.push.apply(errs, findErrors(clause.stmts));
            });
        }
        else {
            // Check any non-clause substatements
            errs.push.apply(errs, findErrors(blockStmt.stmts));
            // Check any clauses
            blockStmt.clauses.forEach(function (clause, index) {
                var clauseRule = blockRule.clauses.find(function (c) { return c.appliesTo(clause); });
                if (!clauseRule) {
                    errs.push(new error_1.error.UnknownClauseError(clause, blockRule));
                }
                else {
                    var similarClausesBefore = blockStmt.clauses
                        .slice(0, index)
                        .filter(function (n) { return clauseRule.appliesTo(n); });
                    // Form allows a max of 1 clause of this type but found more than 1
                    if (clauseRule.limit === 'one' && similarClausesBefore.length > 0) {
                        errs.push(new error_1.error.TooManyClausesError(clause, clauseRule, blockRule));
                    }
                }
                // Check clause statements for internal errors
                errs.push.apply(errs, findErrors(clause.stmts));
            });
            // Check block closing tag
            if (blockStmt.close.text !== blockRule.name) {
                errs.push(new error_1.error.MismatchedClosingTagError(blockStmt, blockRule));
            }
        }
    });
    return errs;
};
var normStmts = function (stmts) {
    return stmts.map(function (s) { return normStmt(s); });
};
var normStmt = function (stmt) {
    switch (stmt.type) {
        case 'text':
            return { type: 'text', text: stmt.text, where: stmt.pos };
        case 'inline':
            return {
                type: 'inline',
                field: normField(stmt.field),
                where: stmt.pos
            };
        case 'block':
            return normBlock(stmt);
    }
};
var normBlock = function (block) {
    var rule = BLOCK_RULES.find(function (r) { return r.appliesTo(block); });
    if (rule) {
        return rule.normalize(block);
    }
    else {
        return {
            type: 'block',
            name: 'unknown',
            field: normField(block.field),
            stmts: normStmts(block.stmts),
            where: block.pos
        };
    }
};
