import React from 'react';
import { AnnotationParams } from '../interfaces/annotation';
import { PDFMetaData } from '../interfaces/pdf';
interface Props {
    pageNumber: number;
    children: React.ReactNode;
    addAnnotation: (annotation: AnnotationParams) => void;
    updateLastAnnotationForEntity: (annotation: AnnotationParams) => void;
    className?: string;
    style?: {
        [key: string]: string;
    };
    pdfInformation: PDFMetaData;
    pdfContext: CanvasRenderingContext2D;
}
declare const Selection: ({ pageNumber, children, addAnnotation, updateLastAnnotationForEntity, className, style, pdfInformation, pdfContext, }: Props) => React.JSX.Element;
export default Selection;
