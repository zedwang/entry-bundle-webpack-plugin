export interface EntryBundleOption {
    filename: string;
    publicPath: string;
    attrs: boolean | AttrOption;
}
interface AttrOption {
    css: Partial<HTMLLinkElement>;
    js: Partial<HTMLScriptElement>;
}
export {};
