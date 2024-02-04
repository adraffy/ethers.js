"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.array_replace = exports.compare_arrays = exports.str_from_cps = exports.explode_cp = exports.quote_cp = exports.hex_cp = void 0;
function hex_cp(cp) {
    return cp.toString(16).toUpperCase().padStart(2, '0');
}
exports.hex_cp = hex_cp;
function quote_cp(cp) {
    return "{" + hex_cp(cp) + "}"; // raffy convention: like "\u{X}" w/o the "\u"
}
exports.quote_cp = quote_cp;
function explode_cp(s) {
    var cps = [];
    for (var pos = 0, len = s.length; pos < len;) {
        var cp = s.codePointAt(pos);
        pos += cp < 0x10000 ? 1 : 2;
        cps.push(cp);
    }
    return cps;
}
exports.explode_cp = explode_cp;
function str_from_cps(cps) {
    var chunk = 4096;
    var len = cps.length;
    if (len < chunk)
        return String.fromCodePoint.apply(String, cps);
    var buf = [];
    for (var i = 0; i < len;) {
        buf.push(String.fromCodePoint.apply(String, cps.slice(i, i += chunk)));
    }
    return buf.join('');
}
exports.str_from_cps = str_from_cps;
function compare_arrays(a, b) {
    var n = a.length;
    var c = n - b.length;
    for (var i = 0; c == 0 && i < n; i++)
        c = a[i] - b[i];
    return c;
}
exports.compare_arrays = compare_arrays;
function array_replace(v, a, b) {
    var prev = 0;
    while (true) {
        var next = v.indexOf(a, prev);
        if (next < 0)
            break;
        v[next] = b;
        prev = next + 1;
    }
}
exports.array_replace = array_replace;
//# sourceMappingURL=utils.js.map