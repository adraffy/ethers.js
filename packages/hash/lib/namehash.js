"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dnsEncode = exports.namehash = exports.isValidName = exports.ensNormalize = void 0;
var bytes_1 = require("@ethersproject/bytes");
var strings_1 = require("@ethersproject/strings");
var keccak256_1 = require("@ethersproject/keccak256");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var lib_1 = require("./ens-normalize/lib");
var Zeros = new Uint8Array(32);
Zeros.fill(0);
function ensNameSplit(name) {
    // the empty string is 0-labels
    // every label must be non-empty
    if (!name)
        return []; // note: "".split('.') === [""]
    return (0, lib_1.ens_normalize)(name).split('.').map(function (x) { return (0, strings_1.toUtf8Bytes)(x); });
}
function ensNormalize(name) {
    return (0, lib_1.ens_normalize)(name);
}
exports.ensNormalize = ensNormalize;
function isValidName(name) {
    // there must be 1+ labels
    // every labels must be non-empty
    try {
        return !!(0, lib_1.ens_normalize)(name);
    }
    catch (_a) { }
    return false;
}
exports.isValidName = isValidName;
function namehash(name) {
    /* istanbul ignore if */
    if (typeof (name) !== "string") {
        logger.throwArgumentError("invalid ENS name; not a string", "name", name);
    }
    var result = Zeros;
    var comps = ensNameSplit(name);
    while (comps.length) {
        result = (0, keccak256_1.keccak256)((0, bytes_1.concat)([result, (0, keccak256_1.keccak256)(comps.pop())]));
    }
    return (0, bytes_1.hexlify)(result);
}
exports.namehash = namehash;
function dnsEncode(name, max) {
    if ((max & 255) !== max)
        max = 63; // max must be exactly 1 byte else 63 (old default)
    return (0, bytes_1.hexlify)((0, bytes_1.concat)(ensNameSplit(name).map(function (comp) {
        if (comp.length > max) {
            throw new Error("invalid DNS encoded entry; length exceeds " + max + " bytes");
        }
        var bytes = new Uint8Array(comp.length + 1);
        bytes[0] = comp.length;
        bytes.set(comp, 1);
        return bytes;
    }))) + "00";
}
exports.dnsEncode = dnsEncode;
//# sourceMappingURL=namehash.js.map