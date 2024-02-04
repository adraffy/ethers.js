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
Object.defineProperty(exports, "__esModule", { value: true });
var lib_1 = require("./lib");
var fs_1 = require("fs");
console.log(run_tests(JSON.parse((0, fs_1.readFileSync)('./tests.json', { encoding: 'utf8' }))));
function run_tests(tests) {
    var errors = [];
    for (var _i = 0, tests_1 = tests; _i < tests_1.length; _i++) {
        var test_1 = tests_1[_i];
        var name_1 = test_1.name, norm = test_1.norm, error = test_1.error;
        if (typeof norm !== 'string')
            norm = name_1;
        try {
            var result = (0, lib_1.ens_normalize)(name_1);
            if (error) {
                errors.push(__assign({ type: 'expected error', result: result }, test_1));
            }
            else if (result != norm) {
                errors.push(__assign({ type: 'wrong norm', result: result }, test_1));
            }
        }
        catch (err) {
            if (!error) {
                errors.push(__assign({ type: 'unexpected error', result: err.message }, test_1));
            }
        }
    }
    return errors;
}
//# sourceMappingURL=validate.js.map