"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const lodash_1 = __importDefault(require("lodash"));
const pdfHelpers_1 = require("../helpers/pdfHelpers");
const useTextLayer = (scale, context, initialTextLayer) => {
    const [textLayer, setTextLayer] = (0, react_1.useState)(initialTextLayer || null);
    const [baseScale, setBaseScale] = (0, react_1.useState)(1.5);
    (0, react_1.useEffect)(() => {
        if (textLayer && context && baseScale !== scale) {
            const rescaledWords = textLayer.map((word) => {
                const coords = (0, pdfHelpers_1.recalculateBoundingBox)(word.coords, baseScale, scale);
                const fontSize = (0, pdfHelpers_1.calculateFontSize)(coords.width, coords.height, word.text);
                const transform = (0, pdfHelpers_1.calculateTransform)(coords.width, fontSize, word.fontFamily, word.text, context);
                return {
                    ...word,
                    coords,
                    fontSize,
                    transform,
                };
            });
            setTextLayer(rescaledWords);
            setBaseScale(scale);
        }
    }, [scale, baseScale, textLayer, context]);
    const buildTextLayer = (0, react_1.useCallback)((textContent, viewport) => {
        const textResult = textContent.items.map((item) => {
            const style = textContent.styles[item.fontName];
            const { left, top, fontSize, transform } = (0, pdfHelpers_1.calculateTextProperties)(item, style, viewport, context);
            return {
                coords: {
                    left,
                    top,
                    width: item.width * scale,
                    height: item.height * scale,
                },
                text: item.str,
                fontSize,
                fontFamily: style.fontFamily,
                transform,
            };
        });
        setTextLayer(lodash_1.default.sortBy(textResult, ['coords.top', 'coords.left']));
    }, [context, scale]);
    return { textLayer, buildTextLayer };
};
exports.default = useTextLayer;
