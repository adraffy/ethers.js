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
export declare type NextFunc = () => number;
export declare type Mapping = [number, number[]];
export declare function decode_arithmetic(bytes: Uint8Array): number[];
export declare function read_compressed_payload(s: string): () => number;
export declare function signed(i: number): number;
export declare function read_deltas(n: number, next: NextFunc): number[];
export declare function read_sorted(next: NextFunc, prev?: number): number[];
export declare function read_sorted_arrays(next: NextFunc): number[][];
export declare function read_member_array(next: NextFunc, lookup?: {
    [i: number]: number;
}): number[];
export declare function read_mapped(next: NextFunc): Mapping[];
export declare function read_array_while<T>(next: (i: number) => T | null): T[];
export declare function read_trie(next: NextFunc): number[][];
//# sourceMappingURL=decoder.d.ts.map