import React from 'react';
import { Annotation } from '../../interfaces/annotation';
interface Props {
    showInput: boolean;
    annotation: Annotation;
    updateAnnotation: (annotation: Annotation) => void;
}
declare const AreaTextAnnotation: ({ showInput, annotation, updateAnnotation }: Props) => React.JSX.Element;
export default AreaTextAnnotation;
