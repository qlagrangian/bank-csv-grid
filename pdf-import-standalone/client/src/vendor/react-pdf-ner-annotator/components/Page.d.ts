import React from 'react';
import { PDFPageProxy } from 'pdfjs-dist';
import { Annotation, AnnotationParams } from '../interfaces/annotation';
import { TextLayerItem, TextLayerType } from '../interfaces/textLayer';
interface Props {
    pageNumber: number;
    shouldRender: boolean;
    page: Promise<PDFPageProxy> | null;
    scale: number;
    rotation?: number;
    annotations: Array<Annotation>;
    addAnnotation: (annotation: AnnotationParams) => void;
    updateLastAnnotationForEntity: (annotation: AnnotationParams) => void;
    addPageToTextMap: (page: number, pdfTextLayer: Array<TextLayerItem>, type: TextLayerType, confidence: number, tokenizer?: RegExp) => void;
    initialTextLayer?: Array<TextLayerItem>;
}
declare const _default: React.MemoExoticComponent<({ pageNumber, shouldRender, page, scale, rotation, annotations, addAnnotation, updateLastAnnotationForEntity, addPageToTextMap, initialTextLayer, }: Props) => React.JSX.Element>;
export default _default;
