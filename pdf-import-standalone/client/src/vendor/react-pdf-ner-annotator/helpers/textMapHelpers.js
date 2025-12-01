"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenizeText = exports.getTextMetrics = exports.buildTextMapFromTextLayer = void 0;
const deburr_1 = __importDefault(require("lodash/deburr"));
const textLayer_1 = require("../interfaces/textLayer");
const buildTextMapFromTextLayer = (pdfTextLayer, type, tokenizer) => {
    const textMap = [];
    if (type === textLayer_1.TextLayerType.TEXT_LAYER) {
        let index = 0;
        pdfTextLayer.forEach((textLayerItem) => {
            if (!textLayerItem.text) {
                return;
            }
            let offset = 0;
            const { text, fontSize, fontFamily, transform, coords } = textLayerItem;
            text.match(tokenizer).forEach((token) => {
                const textWidth = calculateTextWidth(token, fontSize, fontFamily, transform);
                if (token !== ' ') {
                    index += 1;
                    textMap.push({
                        ...textLayerItem,
                        dataI: index,
                        text: token,
                        coords: {
                            left: offset + coords.left,
                            top: coords.top,
                            width: textWidth,
                            height: coords.height,
                        },
                    });
                }
                offset += textWidth;
            });
        });
    }
    else {
        pdfTextLayer.forEach((textLayerItem, index) => {
            textMap.push({
                ...textLayerItem,
                dataI: index,
            });
        });
    }
    return textMap;
};
exports.buildTextMapFromTextLayer = buildTextMapFromTextLayer;
const calculateTextWidth = (text, fontSize, fontFamily, transform) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    return metrics.width * transform;
};
const getTextMetrics = (text) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '12px sans-serif';
    const metrics = context.measureText(text);
    const lineHeight = 1.2 * context.measureText('M').width;
    return {
        width: metrics.width,
        height: lineHeight,
    };
};
exports.getTextMetrics = getTextMetrics;
const tokenizeText = (input, tokenizer, needsTokenization) => {
    if (needsTokenization) {
        return (0, deburr_1.default)(input).match(tokenizer);
    }
    return (0, deburr_1.default)(input).match(new RegExp(/[^\s]+/g));
};
exports.tokenizeText = tokenizeText;
