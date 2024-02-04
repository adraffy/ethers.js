export declare type OutputToken = {
    emoji: boolean;
    cps: number[];
};
export declare type Label = {
    input: number[];
    offset: number;
    error?: Error;
    tokens?: OutputToken[];
    output?: number[];
    type?: string;
};
export declare function ens_normalize(name: string): string;
export declare function ens_beautify(name: string): string;
//# sourceMappingURL=lib.d.ts.map