export function hex_cp(cp) {
    return cp.toString(16).toUpperCase().padStart(2, '0');
}
export function quote_cp(cp) {
    return `{${hex_cp(cp)}}`; // raffy convention: like "\u{X}" w/o the "\u"
}
export function explode_cp(s) {
    let cps = [];
    for (let pos = 0, len = s.length; pos < len;) {
        let cp = s.codePointAt(pos);
        pos += cp < 0x10000 ? 1 : 2;
        cps.push(cp);
    }
    return cps;
}
export function str_from_cps(cps) {
    const chunk = 4096;
    let len = cps.length;
    if (len < chunk)
        return String.fromCodePoint(...cps);
    let buf = [];
    for (let i = 0; i < len;) {
        buf.push(String.fromCodePoint(...cps.slice(i, i += chunk)));
    }
    return buf.join('');
}
export function compare_arrays(a, b) {
    let n = a.length;
    let c = n - b.length;
    for (let i = 0; c == 0 && i < n; i++)
        c = a[i] - b[i];
    return c;
}
export function array_replace(v, a, b) {
    let prev = 0;
    while (true) {
        let next = v.indexOf(a, prev);
        if (next < 0)
            break;
        v[next] = b;
        prev = next + 1;
    }
}
//# sourceMappingURL=utils.js.map