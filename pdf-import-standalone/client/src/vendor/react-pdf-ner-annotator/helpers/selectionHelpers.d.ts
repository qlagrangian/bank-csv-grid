import { Rectangle } from 'tesseract.js';
import { Point } from '../interfaces/point';
export declare const isCoordsEmpty: (coordinates: Rectangle) => boolean;
export declare const calculateSelectionRectangle: (startPoint: Point, endPoint: Point) => Rectangle;
export declare const findIntersectingChildren: (children: Array<any>, selectionRect: Rectangle, offsetX?: number, offsetY?: number) => any[];
