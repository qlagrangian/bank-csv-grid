import { Rectangle } from 'tesseract.js';
export declare const calculateTextProperties: (textItem: TextContentItem, style: any, viewPort: any, context: CanvasRenderingContext2D) => {
    left: any;
    top: any;
    fontSize: number;
    transform: number;
};
export declare const calculateTransform: (canvasWidth: number, fontSize: number, fontFamily: string, text: string, context: CanvasRenderingContext2D) => number;
export declare const calculateFontSize: (width: number, height: number, text: string) => number;
export declare const recalculateBoundingBox: (coordinates: Rectangle, oldScale: number, newScale: number) => Rectangle;
export declare const calculateRectangleProperties: (boundingBox: any) => Rectangle;
export declare const mergeSplitWords: (textContent: TextContent) => TextContent;
