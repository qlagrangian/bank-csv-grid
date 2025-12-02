import { TextLayerItem, TextLayerType } from '../interfaces/textLayer';
export declare const buildTextMapFromTextLayer: (pdfTextLayer: Array<TextLayerItem>, type: TextLayerType, tokenizer?: RegExp) => Array<TextLayerItem>;
export declare const getTextMetrics: (text: string) => {
    width: number;
    height: number;
};
export declare const tokenizeText: (input: string, tokenizer: RegExp, needsTokenization: boolean) => Array<string>;
