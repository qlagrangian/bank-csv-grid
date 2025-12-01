"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeSplitWords = exports.calculateRectangleProperties = exports.recalculateBoundingBox = exports.calculateFontSize = exports.calculateTransform = exports.calculateTextProperties = void 0;
// @ts-ignore
const lodash_1 = __importDefault(require("lodash"));
const PdfJs = __importStar(require("pdfjs-dist/build/pdf"));
const MAX_ALLOWED_DISTANCE = 0.5;
const calculateTextProperties = (textItem, style, viewPort, context) => {
    const tx = PdfJs.Util.transform(viewPort.transform, textItem.transform);
    let angle = Math.atan2(tx[1], tx[0]);
    if (style.vertical) {
        angle += Math.PI / 2;
    }
    const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
    let fontAscent = fontSize;
    if (style.ascent) {
        fontAscent *= style.ascent;
    }
    else if (style.descent) {
        fontAscent *= 1 + style.descent;
    }
    let left;
    let top;
    if (angle === 0) {
        // eslint-disable-next-line prefer-destructuring
        left = tx[4];
        top = tx[5] - fontAscent;
    }
    else {
        left = tx[4] + fontAscent * Math.sin(angle);
        top = tx[5] - fontAscent * Math.cos(angle);
    }
    let canvasWidth;
    if (style.vertical) {
        canvasWidth = textItem.height * viewPort.scale;
    }
    else {
        canvasWidth = textItem.width * viewPort.scale;
    }
    const transform = (0, exports.calculateTransform)(canvasWidth, fontSize, style.fontFamily, textItem.str, context);
    return { left, top, fontSize, transform };
};
exports.calculateTextProperties = calculateTextProperties;
const calculateTransform = (canvasWidth, fontSize, fontFamily, text, context) => {
    let transform = 1;
    if (canvasWidth) {
        context.font = `${fontSize}px ${fontFamily}`;
        const { width } = context.measureText(text);
        transform = canvasWidth / width;
    }
    return transform;
};
exports.calculateTransform = calculateTransform;
const calculateFontSize = (width, height, text) => {
    const area = width * height;
    const { length } = text;
    return Math.sqrt(area / length) * 1.3333;
};
exports.calculateFontSize = calculateFontSize;
const recalculateBoundingBox = (coordinates, oldScale, newScale) => {
    return {
        left: (coordinates.left / oldScale) * newScale,
        top: (coordinates.top / oldScale) * newScale,
        width: (coordinates.width / oldScale) * newScale,
        height: (coordinates.height / oldScale) * newScale,
    };
};
exports.recalculateBoundingBox = recalculateBoundingBox;
const calculateRectangleProperties = (boundingBox) => {
    const { x0, x1, y0, y1 } = boundingBox;
    const width = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y0 - y0, 2));
    const height = Math.sqrt(Math.pow(x1 - x1, 2) + Math.pow(y1 - y0, 2));
    return { left: x0, top: y0, width, height };
};
exports.calculateRectangleProperties = calculateRectangleProperties;
const mergeSplitWords = (textContent) => {
    const { items } = textContent;
    const mergedTextContent = {
        ...textContent,
        items: [],
    };
    items.forEach((item) => {
        let prevWidth = 0;
        const sameLevel = items.filter((candidate) => {
            if (filterByDistance(item, candidate, prevWidth)) {
                prevWidth += candidate.width;
                return true;
            }
            return false;
        });
        if (sameLevel.length) {
            mergedTextContent.items.push({
                ...item,
                width: item.width + sameLevel.map((val) => val.width).reduce((a, b) => a + b, 0),
                str: item.str + sameLevel.map((val) => val.str).join(''),
            });
            items.splice(0, items.length, ...items.filter((candidate) => !lodash_1.default.includes(sameLevel, candidate)));
        }
        else {
            mergedTextContent.items.push(item);
        }
    });
    return mergedTextContent;
};
exports.mergeSplitWords = mergeSplitWords;
const filterByDistance = (current, candidate, addedWidth) => {
    const distance = lodash_1.default.round(candidate.transform[4] - (current.transform[4] + current.width + addedWidth), 1);
    return (current.transform[5] === candidate.transform[5] &&
        current.transform[4] < candidate.transform[4] &&
        distance >= -MAX_ALLOWED_DISTANCE &&
        distance <= MAX_ALLOWED_DISTANCE);
};
