"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.ens_beautify = exports.ens_normalize = void 0;
var include_ens_1 = __importStar(require("./include-ens"));
var decoder_1 = require("./decoder");
var utils_1 = require("./utils");
var nf_1 = require("./nf");
var set_1 = require("./set");
var STOP_CH = '.';
var FE0F = 0xFE0F;
var UNIQUE_PH = 1;
function group_has_cp(g, cp) {
    // 20230913: keep primary and secondary distinct instead of creating valid union
    return g.P[cp] || g.Q[cp];
}
var MAPPED;
var CM = {};
var NSM = {};
var IGNORED = {};
var ESCAPE = {};
var GROUPS;
var WHOLE_VALID = {};
var WHOLE_MAP = {};
var VALID = {};
var EMOJI_ROOT = {};
function init() {
    if (MAPPED)
        return;
    var r = (0, decoder_1.read_compressed_payload)(include_ens_1.default);
    MAPPED = {};
    (0, decoder_1.read_mapped)(r).forEach(function (_a) {
        var x = _a[0], ys = _a[1];
        return MAPPED[x] = ys;
    });
    (0, set_1.set_add_many)(IGNORED, (0, decoder_1.read_sorted)(r)); // ignored characters are not valid, so just read raw codepoints
    // 20230217: we still need all CM for proper error formatting
    // but norm only needs NSM subset that are potentially-valid
    var tempCM = (0, decoder_1.read_sorted)(r);
    (0, set_1.set_add_many)(NSM, (0, decoder_1.read_sorted)(r).map(function (i) { return tempCM[i]; }));
    (0, set_1.set_add_many)(CM, tempCM);
    (0, set_1.set_add_many)(ESCAPE, (0, decoder_1.read_sorted)(r)); // characters that should not be printed
    (0, decoder_1.read_sorted)(r); // dont need this
    var chunks = (0, decoder_1.read_sorted_arrays)(r);
    var unrestricted = r();
    //const read_chunked = () => new Set(read_sorted(r).flatMap(i => chunks[i]).concat(read_sorted(r)));
    var read_chunked = function () {
        // 20230921: build set in parts, 2x faster
        var set = {};
        (0, decoder_1.read_sorted)(r).forEach(function (i) { return (0, set_1.set_add_many)(set, chunks[i]); });
        (0, set_1.set_add_many)(set, (0, decoder_1.read_sorted)(r));
        return set;
    };
    GROUPS = (0, decoder_1.read_array_while)(function (i) {
        // minifier property mangling seems unsafe
        // so these are manually renamed to single chars
        var v = (0, decoder_1.read_array_while)(r).map(function (x) { return x + 0x60; });
        if (!v.length)
            return null;
        var R = i >= unrestricted; // unrestricted then restricted
        v[0] -= 32; // capitalize
        var N = (0, utils_1.str_from_cps)(v);
        if (R)
            N = "Restricted[" + N + "]";
        var P = read_chunked(); // primary
        var Q = read_chunked(); // secondary
        var M = !r(); // not-whitelisted, check for NSM
        return { N: N, P: P, Q: Q, M: M, R: R };
    });
    // decode compressed wholes
    var whole_valid = (0, decoder_1.read_sorted)(r);
    (0, set_1.set_add_many)(WHOLE_VALID, whole_valid);
    var whole_backref = [];
    var wholes = [];
    (0, decoder_1.read_sorted)(r).concat(whole_valid).sort(function (a, b) { return a - b; }).forEach(function (cp, i) {
        var d = r();
        var w;
        if (d) {
            w = whole_backref[i - d];
        }
        else {
            w = { V: [], M: {} };
            wholes.push(w);
        }
        whole_backref[i] = w;
        w.V.push(cp); // add to member set
        if (!WHOLE_VALID[cp]) {
            WHOLE_MAP[cp] = w; // register with whole map
        }
    });
    var _loop_1 = function (V, M) {
        // connect all groups that have each whole character
        var active = {};
        var recs = [];
        var _loop_3 = function (cp) {
            var gs = GROUPS.filter(function (g) { return group_has_cp(g, cp); });
            var rec = recs.find(function (_a) {
                var G = _a.G;
                return gs.some(function (g) { return G[g.N]; });
            });
            if (!rec) {
                rec = { G: {}, V: [] };
                recs.push(rec);
            }
            rec.V.push(cp);
            gs.forEach(function (g) { return rec.G[g.N] = active[g.N] = g; });
        };
        for (var _m = 0, V_1 = V; _m < V_1.length; _m++) {
            var cp = V_1[_m];
            _loop_3(cp);
        }
        // per character cache groups which are not a member of the extent
        var union = Object.values(active);
        var _loop_4 = function (G, V_3) {
            var complement = {};
            union.forEach(function (g) {
                if (!G[g.N])
                    complement[g.N] = g; // groups not covered by the extent
            });
            for (var _q = 0, V_2 = V_3; _q < V_2.length; _q++) {
                var cp = V_2[_q];
                M[cp] = complement; // this is the same reference
            }
        };
        for (var _o = 0, recs_1 = recs; _o < recs_1.length; _o++) {
            var _p = recs_1[_o], G = _p.G, V_3 = _p.V;
            _loop_4(G, V_3);
        }
    };
    // compute confusable-extent complements
    // usage: WHOLE_MAP.get(cp).M.get(cp) = complement set
    for (var _i = 0, wholes_1 = wholes; _i < wholes_1.length; _i++) {
        var _a = wholes_1[_i], V = _a.V, M = _a.M;
        _loop_1(V, M);
    }
    // compute valid set
    // 20230924: VALID was union but can be re-used	
    var multi = {}; // exists in 2+ groups
    var add_to_union = function (cp) { return VALID[cp] ? multi[cp] = cp : VALID[cp] = cp; };
    for (var _b = 0, GROUPS_1 = GROUPS; _b < GROUPS_1.length; _b++) {
        var g = GROUPS_1[_b];
        for (var _c = 0, _d = Object.values(g.P); _c < _d.length; _c++) {
            var cp = _d[_c];
            add_to_union(cp);
        }
        for (var _e = 0, _f = Object.values(g.Q); _e < _f.length; _e++) {
            var cp = _f[_e];
            add_to_union(cp);
        }
    }
    // dual purpose WHOLE_MAP: return placeholder if unique non-confusable
    for (var _g = 0, _h = Object.values(VALID); _g < _h.length; _g++) {
        var cp = _h[_g];
        if (!WHOLE_MAP[cp] && !multi[cp]) {
            WHOLE_MAP[cp] = UNIQUE_PH;
        }
    }
    // add all decomposed parts
    // see derive: "Valid is Closed (via Brute-force)"
    (0, set_1.set_add_many)(VALID, (0, nf_1.nfd)(Object.values(VALID)));
    // decode emoji
    // 20230719: emoji are now fully-expanded to avoid quirk logic 
    var emojis = (0, decoder_1.read_trie)(r).sort(utils_1.compare_arrays);
    for (var _j = 0, emojis_1 = emojis; _j < emojis_1.length; _j++) {
        var cps = emojis_1[_j];
        // 20230719: change to *slightly* stricter algorithm which disallows 
        // insertion of misplaced FE0F in emoji sequences (matching ENSIP-15)
        // example: beautified [A B] (eg. flag emoji) 
        //  before: allow: [A FE0F B], error: [A FE0F FE0F B] 
        //   after: error: both
        // note: this code now matches ENSNormalize.{cs,java} logic
        var prev = [EMOJI_ROOT];
        var _loop_2 = function (cp) {
            var next = prev.map(function (node) {
                var child = node[cp];
                if (!child)
                    node[cp] = child = {};
                return child;
            });
            if (cp === FE0F) {
                prev.push.apply(prev, next); // less than 20 elements
            }
            else {
                prev = next;
            }
        };
        for (var _k = 0, cps_1 = cps; _k < cps_1.length; _k++) {
            var cp = cps_1[_k];
            _loop_2(cp);
        }
        for (var _l = 0, prev_1 = prev; _l < prev_1.length; _l++) {
            var x = prev_1[_l];
            x.V = cps;
        }
    }
}
// if escaped: {HEX}
//       else: "x" {HEX}
function quoted_cp(cp) {
    return (cp in ESCAPE ? '' : bidi_qq(safe_str_from_cps([cp])) + " ") + (0, utils_1.quote_cp)(cp);
}
// 20230211: some messages can be mixed-directional and result in spillover
// use 200E after a quoted string to force the remainder of a string from 
// acquring the direction of the quote
// https://www.w3.org/International/questions/qa-bidi-unicode-controls#exceptions
function bidi_qq(s) {
    return "\"" + s + "\"\u200E"; // strong LTR
}
function check_label_extension(cps) {
    var HYPHEN = 0x2D;
    if (cps.length >= 4 && cps[2] == HYPHEN && cps[3] == HYPHEN) {
        throw new Error("invalid label extension: \"" + (0, utils_1.str_from_cps)(cps.slice(0, 4)) + "\""); // this can only be ascii so cant be bidi
    }
}
function check_leading_underscore(cps) {
    var UNDERSCORE = 0x5F;
    for (var i = cps.lastIndexOf(UNDERSCORE); i > 0;) {
        if (cps[--i] !== UNDERSCORE) {
            throw new Error('underscore allowed only at start');
        }
    }
}
// check that a fenced cp is not leading, trailing, or touching another fenced cp
function check_fenced(cps) {
    var cp = cps[0];
    var prev = include_ens_1.FENCED[cp];
    if (prev)
        throw error_placement("leading " + prev);
    var n = cps.length;
    var last = -1; // prevents trailing from throwing
    for (var i = 1; i < n; i++) {
        cp = cps[i];
        var match = include_ens_1.FENCED[cp];
        if (match) {
            // since cps[0] isn't fenced, cps[1] cannot throw
            if (last == i)
                throw error_placement(prev + " + " + match);
            last = i + 1;
            prev = match;
        }
    }
    if (last == n)
        throw error_placement("trailing " + prev);
}
// create a safe to print string 
// invisibles are escaped
// leading cm uses placeholder
// if cps exceed max, middle truncate with ellipsis
// quoter(cp) => string, eg. 3000 => "{3000}"
// note: in html, you'd call this function then replace [<>&] with entities
function safe_str_from_cps(cps, max) {
    if (max === void 0) { max = Infinity; }
    //if (Number.isInteger(cps)) cps = [cps];
    //if (!Array.isArray(cps)) throw new TypeError(`expected codepoints`);
    var buf = [];
    if (cps[0] in CM)
        buf.push('◌');
    if (cps.length > max) {
        max >>= 1;
        cps = __spreadArray(__spreadArray(__spreadArray([], cps.slice(0, max), true), [0x2026], false), cps.slice(-max), true);
    }
    var prev = 0;
    var n = cps.length;
    for (var i = 0; i < n; i++) {
        var cp = cps[i];
        if (cp in ESCAPE) {
            buf.push((0, utils_1.str_from_cps)(cps.slice(prev, i)));
            buf.push((0, utils_1.quote_cp)(cp));
            prev = i + 1;
        }
    }
    buf.push((0, utils_1.str_from_cps)(cps.slice(prev, n)));
    return buf.join('');
}
function ens_normalize(name) {
    return flatten(split(name, nf_1.nfc, filter_fe0f));
}
exports.ens_normalize = ens_normalize;
function ens_beautify(name) {
    var labels = split(name, nf_1.nfc, function (x) { return x; }); // emoji not exposed
    for (var _i = 0, labels_1 = labels; _i < labels_1.length; _i++) {
        var _a = labels_1[_i], type = _a.type, output = _a.output, error = _a.error;
        if (error)
            break; // flatten will throw
        // replace leading/trailing hyphen
        // 20230121: consider beautifing all or leading/trailing hyphen to unicode variant
        // not exactly the same in every font, but very similar: "-" vs "‐"
        /*
        const UNICODE_HYPHEN = 0x2010;
        // maybe this should replace all for visual consistancy?
        // `node tools/reg-count.js regex ^-\{2,\}` => 592
        //for (let i = 0; i < output.length; i++) if (output[i] == 0x2D) output[i] = 0x2010;
        if (output[0] == HYPHEN) output[0] = UNICODE_HYPHEN;
        let end = output.length-1;
        if (output[end] == HYPHEN) output[end] = UNICODE_HYPHEN;
        */
        // 20230123: WHATWG URL uses "CheckHyphens" false
        // https://url.spec.whatwg.org/#idna
        // update ethereum symbol
        // ξ => Ξ if not greek
        if (type !== 'Greek')
            (0, utils_1.array_replace)(output, 0x3BE, 0x39E);
        // 20221213: fixes bidi subdomain issue, but breaks invariant (200E is disallowed)
        // could be fixed with special case for: 2D (.) + 200E (LTR)
        // https://discuss.ens.domains/t/bidi-label-ordering-spoof/15824
        //output.splice(0, 0, 0x200E);
    }
    return flatten(labels);
}
exports.ens_beautify = ens_beautify;
function split(name, nf, ef) {
    if (!name)
        return []; // 20230719: empty name allowance
    init();
    var offset = 0;
    // https://unicode.org/reports/tr46/#Validity_Criteria
    // 4.) "The label must not contain a U+002E ( . ) FULL STOP."
    return name.split(STOP_CH).map(function (label) {
        var input = (0, utils_1.explode_cp)(label);
        var info = {
            input: input,
            offset: offset,
        };
        offset += input.length + 1; // + stop
        try {
            // 1.) "The label must be in Unicode Normalization Form NFC"
            var tokens = info.tokens = tokens_from_str(input, nf, ef);
            var token_count = tokens.length;
            var type = void 0;
            if (!token_count) { // the label was effectively empty (could of had ignored characters)
                //norm = [];
                //type = 'None'; // use this instead of next match, "ASCII"
                // 20230120: change to strict
                // https://discuss.ens.domains/t/ens-name-normalization-2nd/14564/59
                throw new Error("empty label");
            }
            var norm_1 = info.output = [];
            tokens.forEach(function (_a) {
                var cps = _a.cps;
                return norm_1.push.apply(norm_1, cps);
            });
            check_leading_underscore(norm_1);
            var emoji = token_count > 1 || tokens[0].emoji; // same as: tokens.some(x => x.is_emoji);
            if (!emoji && norm_1.every(function (cp) { return cp < 0x80; })) { // special case for ascii
                // 20230123: matches matches WHATWG, see note 3.3
                check_label_extension(norm_1); // only needed for ascii
                // cant have fenced
                // cant have cm
                // cant have wholes
                // see derive: "Fastpath ASCII"
                type = 'ASCII';
            }
            else {
                var chars_1 = [];
                var unique_set_1 = {};
                tokens.forEach(function (_a) {
                    var emoji = _a.emoji, cps = _a.cps;
                    if (!emoji) {
                        chars_1.push.apply(chars_1, cps); // all of the nfc tokens concat together
                        (0, set_1.set_add_many)(unique_set_1, cps);
                    }
                });
                if (!chars_1.length) { // theres no text, just emoji
                    type = 'Emoji';
                }
                else {
                    // 5.) "The label must not begin with a combining mark, that is: General_Category=Mark."
                    if (norm_1[0] in CM)
                        throw error_placement('leading combining mark');
                    for (var i = 1; i < token_count; i++) { // we've already checked the first token
                        var _a = tokens[i], emoji_1 = _a.emoji, cps = _a.cps;
                        if (!emoji_1 && cps[0] in CM) { // every text token has emoji neighbors, eg. EtEEEtEt...
                            // bidi_qq() not needed since emoji is LTR and cps is a CM
                            throw error_placement("emoji + combining mark: \"" + (0, utils_1.str_from_cps)(tokens[i - 1].cps) + " + " + safe_str_from_cps([cps[0]]) + "\"");
                        }
                    }
                    check_fenced(norm_1);
                    var unique = Object.values(unique_set_1);
                    var g = determine_group(unique)[0]; // take the first match
                    // see derive: "Matching Groups have Same CM Style"
                    // alternative: could form a hybrid type: Latin/Japanese/...	
                    check_group(g, chars_1); // need text in order
                    check_whole(g, unique); // only need unique text (order would be required for multiple-char confusables)
                    type = g.N;
                    // 20230121: consider exposing restricted flag
                    // it's simpler to just check for 'Restricted'
                    // or even better: type.endsWith(']')
                    //if (g.R) info.restricted = true;
                }
            }
            info.type = type;
        }
        catch (err) {
            info.error = err; // use full error object
        }
        return info;
    });
}
function check_whole(group, unique) {
    var maker;
    var shared = [];
    var _loop_5 = function (cp) {
        var whole = WHOLE_MAP[cp];
        if (whole === UNIQUE_PH)
            return { value: void 0 }; // unique, non-confusable
        if (whole) {
            var set_2 = whole.M[cp]; // groups which have a character that look-like this character
            maker = maker ? maker.filter(function (g) { return set_2[g.N]; }) : Object.values(set_2);
            if (!maker.length)
                return { value: void 0 }; // confusable intersection is empty
        }
        else {
            shared.push(cp);
        }
    };
    for (var _i = 0, unique_1 = unique; _i < unique_1.length; _i++) {
        var cp = unique_1[_i];
        var state_1 = _loop_5(cp);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    if (maker) {
        var _loop_6 = function (g) {
            if (shared.every(function (cp) { return group_has_cp(g, cp); })) {
                throw new Error("whole-script confusable: " + group.N + "/" + g.N);
            }
        };
        // we have 1+ confusable
        // check if any of the remaining groups
        // contain the shared characters too
        for (var _a = 0, maker_1 = maker; _a < maker_1.length; _a++) {
            var g = maker_1[_a];
            _loop_6(g);
        }
    }
}
// assumption: unique.size > 0
// returns list of matching groups
function determine_group(unique) {
    var groups = GROUPS;
    var _loop_7 = function (cp) {
        // note: we need to dodge CM that are whitelisted
        // but that code isn't currently necessary
        var gs = groups.filter(function (g) { return group_has_cp(g, cp); });
        if (!gs.length) {
            if (!GROUPS.some(function (g) { return group_has_cp(g, cp); })) {
                // the character was composed of valid parts
                // but it's NFC form is invalid
                // 20230716: change to more exact statement, see: ENSNormalize.{cs,java}
                // note: this doesn't have to be a composition
                // 20230720: change to full check
                throw error_disallowed(cp); // this should be rare
            }
            else {
                // there is no group that contains all these characters
                // throw using the highest priority group that matched
                // https://www.unicode.org/reports/tr39/#mixed_script_confusables
                throw error_group_member(groups[0], cp);
            }
        }
        groups = gs;
        if (gs.length == 1)
            return "break"; // there is only one group left
    };
    for (var _i = 0, unique_2 = unique; _i < unique_2.length; _i++) {
        var cp = unique_2[_i];
        var state_2 = _loop_7(cp);
        if (state_2 === "break")
            break;
    }
    // there are at least 1 group(s) with all of these characters
    return groups;
}
// throw on first error
function flatten(split) {
    return split.map(function (_a) {
        var input = _a.input, error = _a.error, output = _a.output;
        if (error) {
            // don't print label again if just a single label
            var msg = error.message;
            // bidi_qq() only necessary if msg is digits
            throw new Error(split.length == 1 ? msg : "Invalid label " + bidi_qq(safe_str_from_cps(input, 63)) + ": " + msg);
        }
        return (0, utils_1.str_from_cps)(output);
    }).join(STOP_CH);
}
function error_disallowed(cp) {
    // TODO: add cp to error?
    return new Error("disallowed character: " + quoted_cp(cp));
}
function error_group_member(g, cp) {
    var quoted = quoted_cp(cp);
    var gg = GROUPS.find(function (g) { return g.P[cp]; }); // only check primary
    if (gg) {
        quoted = gg.N + " " + quoted;
    }
    return new Error("illegal mixture: " + g.N + " + " + quoted);
}
function error_placement(where) {
    return new Error("illegal placement: " + where);
}
// assumption: cps.length > 0
// assumption: cps[0] isn't a CM
// assumption: the previous character isn't an emoji
function check_group(g, cps) {
    for (var _i = 0, cps_2 = cps; _i < cps_2.length; _i++) {
        var cp = cps_2[_i];
        if (!group_has_cp(g, cp)) {
            // for whitelisted scripts, this will throw illegal mixture on invalid cm, eg. "e{300}{300}"
            // at the moment, it's unnecessary to introduce an extra error type
            // until there exists a whitelisted multi-character
            //   eg. if (M < 0 && is_combining_mark(cp)) { ... }
            // there are 3 cases:
            //   1. illegal cm for wrong group => mixture error
            //   2. illegal cm for same group => cm error
            //       requires set of whitelist cm per group: 
            //        eg. new Set([...g.P, ...g.Q].flatMap(nfc).filter(cp => CM.has(cp)))
            //   3. wrong group => mixture error
            throw error_group_member(g, cp);
        }
    }
    //if (M >= 0) { // we have a known fixed cm count
    if (g.M) { // we need to check for NSM
        var decomposed = (0, nf_1.nfd)(cps);
        for (var i = 1, e = decomposed.length; i < e; i++) { // see: assumption
            // 20230210: bugfix: using cps instead of decomposed h/t Carbon225
            /*
            if (CM.has(decomposed[i])) {
                let j = i + 1;
                while (j < e && CM.has(decomposed[j])) j++;
                if (j - i > M) {
                    throw new Error(`too many combining marks: ${g.N} ${bidi_qq(str_from_cps(decomposed.slice(i-1, j)))} (${j-i}/${M})`);
                }
                i = j;
            }
            */
            // 20230217: switch to NSM counting
            // https://www.unicode.org/reports/tr39/#Optional_Detection
            if (decomposed[i] in NSM) {
                var j = i + 1;
                for (var cp = void 0; j < e && (cp = decomposed[j]) in NSM; j++) {
                    // a. Forbid sequences of the same nonspacing mark.
                    for (var k = i; k < j; k++) { // O(n^2) but n < 100
                        if (decomposed[k] == cp) {
                            throw new Error("duplicate non-spacing marks: " + quoted_cp(cp));
                        }
                    }
                }
                // parse to end so we have full nsm count
                // b. Forbid sequences of more than 4 nonspacing marks (gc=Mn or gc=Me).
                if (j - i > include_ens_1.NSM_MAX) {
                    // note: this slice starts with a base char or spacing-mark cm
                    throw new Error("excessive non-spacing marks: " + bidi_qq(safe_str_from_cps(decomposed.slice(i - 1, j))) + " (" + (j - i) + "/" + include_ens_1.NSM_MAX + ")");
                }
                i = j;
            }
        }
    }
    // *** this code currently isn't needed ***
    /*
    let cm_whitelist = M instanceof Map;
    for (let i = 0, e = cps.length; i < e; ) {
        let cp = cps[i++];
        let seqs = cm_whitelist && M.get(cp);
        if (seqs) {
            // list of codepoints that can follow
            // if this exists, this will always be 1+
            let j = i;
            while (j < e && CM.has(cps[j])) j++;
            let cms = cps.slice(i, j);
            let match = seqs.find(seq => !compare_arrays(seq, cms));
            if (!match) throw new Error(`disallowed combining mark sequence: "${safe_str_from_cps([cp, ...cms])}"`);
            i = j;
        } else if (!V.has(cp)) {
            // https://www.unicode.org/reports/tr39/#mixed_script_confusables
            let quoted = quoted_cp(cp);
            for (let cp of cps) {
                let u = UNIQUE.get(cp);
                if (u && u !== g) {
                    // if both scripts are restricted this error is confusing
                    // because we don't differentiate RestrictedA from RestrictedB
                    if (!u.R) quoted = `${quoted} is ${u.N}`;
                    break;
                }
            }
            throw new Error(`disallowed ${g.N} character: ${quoted}`);
            //throw new Error(`disallowed character: ${quoted} (expected ${g.N})`);
            //throw new Error(`${g.N} does not allow: ${quoted}`);
        }
    }
    if (!cm_whitelist) {
        let decomposed = nfd(cps);
        for (let i = 1, e = decomposed.length; i < e; i++) { // we know it can't be cm leading
            if (CM.has(decomposed[i])) {
                let j = i + 1;
                while (j < e && CM.has(decomposed[j])) j++;
                if (j - i > M) {
                    throw new Error(`too many combining marks: "${str_from_cps(decomposed.slice(i-1, j))}" (${j-i}/${M})`);
                }
                i = j;
            }
        }
    }
    */
}
// given a list of codepoints
// returns a list of lists, where emoji are a fully-qualified (as Array subclass)
// eg. explode_cp("abc💩d") => [[61, 62, 63], Emoji[1F4A9, FE0F], [64]]
// 20230818: rename for 'process' name collision h/t Javarome
// https://github.com/adraffy/ens-normalize.js/issues/23
function tokens_from_str(input, nf, ef) {
    var ret = [];
    var chars = [];
    input = input.slice().reverse(); // flip so we can pop
    while (input.length) {
        var emoji = consume_emoji_reversed(input);
        if (emoji) {
            add_text();
            ret.push({ emoji: true, cps: ef(emoji) });
        }
        else {
            var cp = input.pop();
            if (VALID[cp]) {
                chars.push(cp);
            }
            else {
                var cps = MAPPED[cp];
                if (cps) {
                    chars.push.apply(chars, cps); // less than 10 elements
                }
                else if (!(cp in IGNORED)) {
                    // 20230912: unicode 15.1 changed the order of processing such that
                    // disallowed parts are only rejected after NFC
                    // https://unicode.org/reports/tr46/#Validity_Criteria
                    // this doesn't impact normalization as of today
                    // technically, this error can be removed as the group logic will apply similar logic
                    // however the error type might be less clear
                    throw error_disallowed(cp);
                }
            }
        }
    }
    add_text();
    return ret;
    function add_text() {
        if (chars.length) {
            ret.push({ emoji: false, cps: nf(chars) });
            chars = [];
        }
    }
}
function filter_fe0f(cps) {
    return cps.filter(function (cp) { return cp != FE0F; });
}
// given array of codepoints
// returns the longest valid emoji sequence (or undefined if no match)
// *MUTATES* the supplied array
// disallows interleaved ignored characters
// fills (optional) eaten array with matched codepoints
function consume_emoji_reversed(cps) {
    var node = EMOJI_ROOT;
    var emoji;
    var pos = cps.length;
    while (pos) {
        node = node[cps[--pos]];
        if (!node)
            break;
        var V = node.V;
        if (V) { // this is a valid emoji (so far)
            emoji = V;
            cps.length = pos; // truncate
        }
    }
    return emoji;
}
//# sourceMappingURL=lib.js.map