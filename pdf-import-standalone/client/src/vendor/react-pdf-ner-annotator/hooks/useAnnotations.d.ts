import { Annotation, AnnotationParams } from '../interfaces/annotation';
declare const useAnnotations: (defaultAnnotations: Array<Annotation>, readonly: boolean, shouldUpdateDefaultAnnotations: boolean) => {
    annotations: Annotation[];
    getAnnotationsForPage: (page: number) => Array<Annotation>;
    addAnnotation: (annotation: AnnotationParams) => void;
    updateAnnotation: (annotation: Annotation) => void;
    updateLastAnnotationForEntity: (annotation: AnnotationParams) => void;
    removeAnnotation: (id: number) => void;
    lastActionHash: string;
};
export default useAnnotations;
