// https://unicode.org/reports/tr15/
// for reference implementation
// see: /derive/nf.js
import COMPRESSED from './include-nf';
import { read_compressed_payload, read_sorted, read_sorted_arrays, read_mapped } from './decoder';
import { set_add_many } from './set';
// algorithmic hangul
// https://www.unicode.org/versions/Unicode15.0.0/ch03.pdf (page 144)
const S0 = 0xAC00;
const L0 = 0x1100;
const V0 = 0x1161;
const T0 = 0x11A7;
const L_COUNT = 19;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = L_COUNT * N_COUNT;
const S1 = S0 + S_COUNT;
const L1 = L0 + L_COUNT;
const V1 = V0 + V_COUNT;
const T1 = T0 + T_COUNT;
function unpack_cc(packed) {
    return (packed >> 24) & 0xFF;
}
function unpack_cp(packed) {
    return packed & 0xFFFFFF;
}
let SHIFTED_RANK;
let EXCLUSIONS = {};
let DECOMP = {};
let RECOMP = {};
function init() {
    if (SHIFTED_RANK)
        return;
    SHIFTED_RANK = {};
    let r = read_compressed_payload(COMPRESSED);
    read_sorted_arrays(r).forEach((v, i) => {
        for (let x of v) {
            SHIFTED_RANK[x] = (i + 1) << 24; // pre-shifted
        }
    });
    set_add_many(EXCLUSIONS, read_sorted(r));
    for (const [cp, cps] of read_mapped(r)) {
        if (!EXCLUSIONS[cp] && cps.length == 2) {
            let [a, b] = cps;
            let bucket = RECOMP[a];
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
        let recomp = RECOMP[a];
        if (recomp) {
            let recomp2 = recomp[b];
            if (recomp2) {
                return recomp2;
            }
        }
        return -1;
    }
}
function decomposed(cps) {
    init();
    let ret = [];
    let buf = [];
    let check_order = false;
    function add(cp) {
        let cc = SHIFTED_RANK[cp];
        if (cc) {
            check_order = true;
            cp |= cc;
        }
        ret.push(cp);
    }
    for (let cp of cps) {
        while (true) {
            if (cp < 0x80) {
                ret.push(cp);
            }
            else if (is_hangul(cp)) {
                let s_index = cp - S0;
                let l_index = s_index / N_COUNT | 0;
                let v_index = (s_index % N_COUNT) / T_COUNT | 0;
                let t_index = s_index % T_COUNT;
                add(L0 + l_index);
                add(V0 + v_index);
                if (t_index > 0)
                    add(T0 + t_index);
            }
            else {
                let mapped = DECOMP[cp];
                if (mapped) {
                    buf.push(...mapped);
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
        let prev_cc = unpack_cc(ret[0]);
        for (let i = 1; i < ret.length; i++) {
            let cc = unpack_cc(ret[i]);
            if (cc == 0 || prev_cc <= cc) {
                prev_cc = cc;
                continue;
            }
            let j = i - 1;
            while (true) {
                let tmp = ret[j + 1];
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
    let ret = [];
    let stack = [];
    let prev_cp = -1;
    let prev_cc = 0;
    for (let packed of v) {
        let cc = unpack_cc(packed);
        let cp = unpack_cp(packed);
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
                ret.push(prev_cp, ...stack);
                stack.length = 0;
                prev_cp = cp;
            }
            else {
                stack.push(cp);
            }
            prev_cc = cc;
        }
        else {
            let composed = compose_pair(prev_cp, cp);
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
        ret.push(prev_cp, ...stack);
    }
    return ret;
}
// note: cps can be iterable
export function nfd(cps) {
    return decomposed(cps).map(unpack_cp);
}
export function nfc(cps) {
    return composed_from_decomposed(decomposed(cps));
}
//# sourceMappingURL=nf.js.map