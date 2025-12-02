import React from 'react';
import { Annotation } from '../../interfaces/annotation';
interface Props {
    pdfScale: number;
    annotation: Annotation;
    removeAnnotation: (id: number) => void;
    updateAnnotation: (annotation: Annotation) => void;
}
declare const AreaMark: ({ pdfScale, annotation, removeAnnotation, updateAnnotation }: Props) => React.JSX.Element;
export default AreaMark;
