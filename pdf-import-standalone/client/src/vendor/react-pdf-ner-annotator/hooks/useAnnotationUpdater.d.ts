import { Annotation } from '../interfaces/annotation';
declare const useAnnotationUpdater: (actionHash: string, annotations: Array<Annotation>, readonly: boolean, updateAnnotationsParent: (annotations: Array<Annotation>) => void) => void;
export default useAnnotationUpdater;
