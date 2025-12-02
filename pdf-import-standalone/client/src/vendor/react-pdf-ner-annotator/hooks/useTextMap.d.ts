import { TextLayer, TextLayerItem, TextLayerType } from '../interfaces/textLayer';
import { Annotation } from '../interfaces/annotation';
declare const useTextMap: (annotations: Array<Annotation>) => {
    textMap: TextLayer[];
    addPageToTextMap: (page: number, pdfTextLayer: Array<TextLayerItem>, type: TextLayerType, confidence: number, tokenizer?: RegExp) => void;
};
export default useTextMap;
