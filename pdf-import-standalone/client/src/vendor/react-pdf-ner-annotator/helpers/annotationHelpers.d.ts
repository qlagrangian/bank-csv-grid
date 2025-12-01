import { Rectangle } from 'tesseract.js';
import { AnnotationParams } from '../interfaces/annotation';
import { Entity } from '../interfaces/entity';
import { PDFMetaData } from '../interfaces/pdf';
export declare const buildNerAnnotation: (pageNumber: number, entity: Entity, selectionChildren: any, targetCoords: Rectangle) => AnnotationParams;
export declare const buildAreaAnnotation: (pageNumber: number, entity: Entity, targetCoords: Rectangle, pdfInformation: PDFMetaData, context: CanvasRenderingContext2D) => AnnotationParams;
