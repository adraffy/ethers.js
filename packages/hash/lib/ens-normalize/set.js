"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.set_add_many = void 0;
function set_add_many(set, v) {
    for (var _i = 0, v_1 = v; _i < v_1.length; _i++) {
        var x = v_1[_i];
        set[x] = x;
    }
}
exports.set_add_many = set_add_many;
//# sourceMappingURL=set.js.map