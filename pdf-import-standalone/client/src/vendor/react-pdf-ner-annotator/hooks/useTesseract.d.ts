import { OCRResult } from '../interfaces/orc';
declare const useTesseract: (scale: number, context: CanvasRenderingContext2D) => {
    ocrResult: OCRResult;
    ocrError: string;
    ocrLoading: boolean;
    doOCR: (language?: string) => Promise<import("tesseract.js").RecognizeResult>;
};
export default useTesseract;
