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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.read_trie = exports.read_array_while = exports.read_mapped = exports.read_member_array = exports.read_sorted_arrays = exports.read_sorted = exports.read_deltas = exports.signed = exports.read_compressed_payload = exports.decode_arithmetic = void 0;
var base64_1 = require("@ethersproject/base64");
function decode_arithmetic(bytes) {
    var pos = 0;
    function u16() { return (bytes[pos++] << 8) | bytes[pos++]; }
    // decode the frequency table
    var symbol_count = u16();
    var total = 1;
    var acc = [0, 1]; // first symbol has frequency 1
    for (var i = 1; i < symbol_count; i++) {
        acc.push(total += u16());
    }
    // skip the sized-payload that the last 3 symbols index into
    var skip = u16();
    var pos_payload = pos;
    pos += skip;
    var read_width = 0;
    var read_buffer = 0;
    function read_bit() {
        if (read_width == 0) {
            // this will read beyond end of buffer
            // but (undefined|0) => zero pad
            read_buffer = (read_buffer << 8) | bytes[pos++];
            read_width = 8;
        }
        return (read_buffer >> --read_width) & 1;
    }
    var N = 31;
    var FULL = Math.pow(2, N);
    var HALF = FULL >>> 1;
    var QRTR = HALF >> 1;
    var MASK = FULL - 1;
    // fill register
    var register = 0;
    for (var i = 0; i < N; i++)
        register = (register << 1) | read_bit();
    var symbols = [];
    var low = 0;
    var range = FULL; // treat like a float
    while (true) {
        var value = Math.floor((((register - low + 1) * total) - 1) / range);
        var start = 0;
        var end = symbol_count;
        while (end - start > 1) { // binary search
            var mid = (start + end) >>> 1;
            if (value < acc[mid]) {
                end = mid;
            }
            else {
                start = mid;
            }
        }
        if (start == 0)
            break; // first symbol is end mark
        symbols.push(start);
        var a = low + Math.floor(range * acc[start] / total);
        var b = low + Math.floor(range * acc[start + 1] / total) - 1;
        while (((a ^ b) & HALF) == 0) {
            register = (register << 1) & MASK | read_bit();
            a = (a << 1) & MASK;
            b = (b << 1) & MASK | 1;
        }
        while (a & ~b & QRTR) {
            register = (register & HALF) | ((register << 1) & (MASK >>> 1)) | read_bit();
            a = (a << 1) ^ HALF;
            b = ((b ^ HALF) << 1) | HALF | 1;
        }
        low = a;
        range = 1 + b - a;
    }
    var offset = symbol_count - 4;
    return symbols.map(function (x) {
        switch (x - offset) {
            case 3: return offset + 0x10100 + ((bytes[pos_payload++] << 16) | (bytes[pos_payload++] << 8) | bytes[pos_payload++]);
            case 2: return offset + 0x100 + ((bytes[pos_payload++] << 8) | bytes[pos_payload++]);
            case 1: return offset + bytes[pos_payload++];
            default: return x - 1;
        }
    });
}
exports.decode_arithmetic = decode_arithmetic;
function read_compressed_payload(s) {
    var v = decode_arithmetic((0, base64_1.decode)(s));
    var pos = 0;
    return function () { return v[pos++]; };
}
exports.read_compressed_payload = read_compressed_payload;
// eg. [0,1,2,3...] => [0,-1,1,-2,...]
function signed(i) {
    return (i & 1) ? (~i >> 1) : (i >> 1);
}
exports.signed = signed;
function read_counts(n, next) {
    var v = [];
    for (var i = 0; i < n; i++)
        v[i] = 1 + next();
    return v;
}
function read_ascending(n, next) {
    var v = [];
    for (var i = 0, x = -1; i < n; i++)
        v[i] = x += 1 + next();
    return v;
}
function read_deltas(n, next) {
    var v = [];
    for (var i = 0, x = 0; i < n; i++)
        v[i] = x += signed(next());
    return v;
}
exports.read_deltas = read_deltas;
// [123][5] => [0 3] [1 1] [0 0]
function read_sorted(next, prev) {
    if (prev === void 0) { prev = 0; }
    var v = [];
    while (true) {
        var x = next();
        var n = next();
        if (!n)
            break;
        prev += x;
        for (var i = 0; i < n; i++) {
            v.push(prev + i);
        }
        prev += n + 1;
    }
    return v;
}
exports.read_sorted = read_sorted;
function read_sorted_arrays(next) {
    return read_array_while(function () {
        var v = read_sorted(next);
        return v.length ? v : null;
    });
}
exports.read_sorted_arrays = read_sorted_arrays;
// return unsorted? unique array 
function read_member_array(next, lookup) {
    var v = read_ascending(next(), next);
    var n = next();
    var vX = read_ascending(n, next);
    var vN = read_counts(n, next);
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < vN[i]; j++) {
            v.push(vX[i] + j);
        }
    }
    return lookup ? v.map(function (x) { return lookup[x]; }) : v;
}
exports.read_member_array = read_member_array;
// returns map of x => ys
function read_mapped(next) {
    var ret = [];
    while (true) {
        var w = next();
        if (w == 0)
            break;
        read_linear_table(w, next, ret);
    }
    while (true) {
        var w = next() - 1;
        if (w < 0)
            break;
        read_replacement_table(w, next, ret);
    }
    return ret;
}
exports.read_mapped = read_mapped;
// read until next is falsy
// return array of read values
function read_array_while(next) {
    var v = [];
    while (true) {
        var x = next(v.length);
        if (!x)
            break;
        v.push(x);
    }
    return v;
}
exports.read_array_while = read_array_while;
// read w columns of length n
// return as n rows of length w
function read_transposed(n, w, next) {
    var m = [];
    for (var i = 0; i < n; i++)
        m.push([]);
    for (var i = 0; i < w; i++) {
        read_deltas(n, next).forEach(function (x, j) { return m[j].push(x); });
    }
    return m;
}
// returns [[x, ys], [x+dx, ys+dy], [x+2*dx, ys+2*dy], ...]
// where dx/dy = steps, n = run size, w = length of y
function read_linear_table(w, next, into) {
    var dx = 1 + next();
    var dy = next();
    var vN = read_array_while(next);
    read_transposed(vN.length, 1 + w, next).forEach(function (v, i) {
        var n = vN[i];
        var x = v[0], ys = v.slice(1);
        var _loop_1 = function (j) {
            var j_dy = j * dy;
            into.push([x + j * dx, ys.map(function (y) { return y + j_dy; })]);
        };
        for (var j = 0; j < n; j++) {
            _loop_1(j);
        }
    });
}
// return [[x, ys...], ...]
// where w = length of y
function read_replacement_table(w, next, into) {
    read_transposed(1 + next(), 1 + w, next).forEach(function (v) {
        into.push([v[0], v.slice(1)]);
    });
}
function read_trie(next) {
    var ret = [];
    var sorted = read_sorted(next);
    expand(decode([]), [], 0);
    return ret; // not sorted
    function decode(Q) {
        var S = next(); // state: valid, save, check
        var B = read_array_while(function () {
            var cps = read_sorted(next).map(function (i) { return sorted[i]; });
            return cps.length ? decode(cps) : null;
        });
        return { S: S, B: B, Q: Q };
    }
    function expand(_a, cps, saved) {
        var S = _a.S, B = _a.B;
        if (S & 4 && saved === cps[cps.length - 1])
            return;
        if (S & 2)
            saved = cps[cps.length - 1];
        if (S & 1)
            ret.push(cps);
        for (var _i = 0, B_1 = B; _i < B_1.length; _i++) {
            var br = B_1[_i];
            for (var _b = 0, _c = br.Q; _b < _c.length; _b++) {
                var cp = _c[_b];
                expand(br, __spreadArray(__spreadArray([], cps, true), [cp], false), saved);
            }
        }
    }
}
exports.read_trie = read_trie;
//# sourceMappingURL=decoder.js.map