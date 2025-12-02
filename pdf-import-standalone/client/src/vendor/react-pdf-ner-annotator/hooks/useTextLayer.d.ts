import { TextLayerItem } from '../interfaces/textLayer';
declare const useTextLayer: (scale: number, context: CanvasRenderingContext2D, initialTextLayer?: Array<TextLayerItem>) => {
    textLayer: TextLayerItem[];
    buildTextLayer: (textContent: TextContent, viewport: PDFPageViewport) => void;
};
export default useTextLayer;
