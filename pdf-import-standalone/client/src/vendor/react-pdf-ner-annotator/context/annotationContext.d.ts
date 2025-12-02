import { Annotation } from '../interfaces/annotation';
import { IEntityHover } from '../interfaces/entity';
interface AnnotationContextProps {
    annotations: Array<Annotation>;
    removeAnnotation: (id: number) => void;
    updateAnnotation: (annotation: Annotation) => void;
    tokenizer: RegExp;
    hoveredEntities?: Array<IEntityHover>;
}
declare const AnnotationContext: import("react").Context<AnnotationContextProps>;
export default AnnotationContext;
