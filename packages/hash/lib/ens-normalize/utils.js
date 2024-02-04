"use strict";
/**
 * MIT License
 *
 * Copyright (c) 2021 Andrew Raffensperger
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This is a near carbon-copy of the original source (link below) with the
 * TypeScript typings added and a few tweaks to make it ES3-compatible.
 *
 * See: https://github.com/adraffy/ens-normalize.js
 */
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