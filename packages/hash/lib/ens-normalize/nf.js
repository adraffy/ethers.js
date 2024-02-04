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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nfc = exports.nfd = void 0;
// https://unicode.org/reports/tr15/
// for reference implementation
// see: /derive/nf.js
var include_nf_1 = __importDefault(require("./include-nf"));
var decoder_1 = require("./decoder");
var set_1 = require("./set");
// algorithmic hangul
// https://www.unicode.org/versions/Unicode15.0.0/ch03.pdf (page 144)
var S0 = 0xAC00;
var L0 = 0x1100;
var V0 = 0x1161;
var T0 = 0x11A7;
var L_COUNT = 19;
var V_COUNT = 21;
var T_COUNT = 28;
var N_COUNT = V_COUNT * T_COUNT;
var S_COUNT = L_COUNT * N_COUNT;
var S1 = S0 + S_COUNT;
var L1 = L0 + L_COUNT;
var V1 = V0 + V_COUNT;
var T1 = T0 + T_COUNT;
function unpack_cc(packed) {
    return (packed >> 24) & 0xFF;
}
function unpack_cp(packed) {
    return packed & 0xFFFFFF;
}
var SHIFTED_RANK;
var EXCLUSIONS = {};
var DECOMP = {};
var RECOMP = {};
function init() {
    if (SHIFTED_RANK)
        return;
    SHIFTED_RANK = {};
    var r = (0, decoder_1.read_compressed_payload)(include_nf_1.default);
    (0, decoder_1.read_sorted_arrays)(r).forEach(function (v, i) {
        for (var _i = 0, v_1 = v; _i < v_1.length; _i++) {
            var x = v_1[_i];
            SHIFTED_RANK[x] = (i + 1) << 24; // pre-shifted
        }
    });
    (0, set_1.set_add_many)(EXCLUSIONS, (0, decoder_1.read_sorted)(r));
    for (var _i = 0, _a = (0, decoder_1.read_mapped)(r); _i < _a.length; _i++) {
        var _b = _a[_i], cp = _b[0], cps = _b[1];
        if (!EXCLUSIONS[cp] && cps.length == 2) {
            var a = cps[0], b = cps[1];
            var bucket = RECOMP[a];
            if (!bucket)
                RECOMP[a] = bucket = {};
            bucket[b] = cp;
        }
        DECOMP[cp] = cps.reverse(); // stored reversed
    }
}
function is_hangul(cp) {
    return cp >= S0 && cp < S1;
}
function compose_pair(a, b) {
    if (a >= L0 && a < L1 && b >= V0 && b < V1) {
        return S0 + (a - L0) * N_COUNT + (b - V0) * T_COUNT;
    }
    else if (is_hangul(a) && b > T0 && b < T1 && (a - S0) % T_COUNT == 0) {
        return a + (b - T0);
    }
    else {
        var recomp = RECOMP[a];
        if (recomp) {
            var recomp2 = recomp[b];
            if (recomp2) {
                return recomp2;
            }
        }
        return -1;
    }
}
function decomposed(cps) {
    init();
    var ret = [];
    var buf = [];
    var check_order = false;
    function add(cp) {
        var cc = SHIFTED_RANK[cp];
        if (cc) {
            check_order = true;
            cp |= cc;
        }
        ret.push(cp);
    }
    for (var _i = 0, cps_1 = cps; _i < cps_1.length; _i++) {
        var cp = cps_1[_i];
        while (true) {
            if (cp < 0x80) {
                ret.push(cp);
            }
            else if (is_hangul(cp)) {
                var s_index = cp - S0;
                var l_index = s_index / N_COUNT | 0;
                var v_index = (s_index % N_COUNT) / T_COUNT | 0;
                var t_index = s_index % T_COUNT;
                add(L0 + l_index);
                add(V0 + v_index);
                if (t_index > 0)
                    add(T0 + t_index);
            }
            else {
                var mapped = DECOMP[cp];
                if (mapped) {
                    buf.push.apply(buf, mapped);
                }
                else {
                    add(cp);
                }
            }
            if (!buf.length)
                break;
            cp = buf.pop();
        }
    }
    if (check_order && ret.length > 1) {
        var prev_cc = unpack_cc(ret[0]);
        for (var i = 1; i < ret.length; i++) {
            var cc = unpack_cc(ret[i]);
            if (cc == 0 || prev_cc <= cc) {
                prev_cc = cc;
                continue;
            }
            var j = i - 1;
            while (true) {
                var tmp = ret[j + 1];
                ret[j + 1] = ret[j];
                ret[j] = tmp;
                if (!j)
                    break;
                prev_cc = unpack_cc(ret[--j]);
                if (prev_cc <= cc)
                    break;
            }
            prev_cc = unpack_cc(ret[i]);
        }
    }
    return ret;
}
function composed_from_decomposed(v) {
    var ret = [];
    var stack = [];
    var prev_cp = -1;
    var prev_cc = 0;
    for (var _i = 0, v_2 = v; _i < v_2.length; _i++) {
        var packed = v_2[_i];
        var cc = unpack_cc(packed);
        var cp = unpack_cp(packed);
        if (prev_cp == -1) {
            if (cc == 0) {
                prev_cp = cp;
            }
            else {
                ret.push(cp);
            }
        }
        else if (prev_cc > 0 && prev_cc >= cc) {
            if (cc == 0) {
                ret.push.apply(ret, __spreadArray([prev_cp], stack, false));
                stack.length = 0;
                prev_cp = cp;
            }
            else {
                stack.push(cp);
            }
            prev_cc = cc;
        }
        else {
            var composed = compose_pair(prev_cp, cp);
            if (composed >= 0) {
                prev_cp = composed;
            }
            else if (prev_cc == 0 && cc == 0) {
                ret.push(prev_cp);
                prev_cp = cp;
            }
            else {
                stack.push(cp);
                prev_cc = cc;
            }
        }
    }
    if (prev_cp >= 0) {
        ret.push.apply(ret, __spreadArray([prev_cp], stack, false));
    }
    return ret;
}
// note: cps can be iterable
function nfd(cps) {
    return decomposed(cps).map(unpack_cp);
}
exports.nfd = nfd;
function nfc(cps) {
    return composed_from_decomposed(decomposed(cps));
}
exports.nfc = nfc;
//# sourceMappingURL=nf.js.map