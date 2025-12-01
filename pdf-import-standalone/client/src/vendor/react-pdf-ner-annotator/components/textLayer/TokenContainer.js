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
const react_1 = __importStar(require("react"));
const textMapHelpers_1 = require("../../helpers/textMapHelpers");
const Token_1 = __importDefault(require("./Token"));
const Mark_1 = __importDefault(require("./Mark"));
const generalHelpers_1 = require("../../helpers/generalHelpers");
const annotationContext_1 = __importDefault(require("../../context/annotationContext"));
const TokenContainer = ({ textLayerItem, tokens, offset, pageNumber }) => {
    let index = 0;
    let spaceAsMark = false;
    const { text, coords, fontSize, transform, fontFamily } = textLayerItem;
    const context = (0, react_1.useContext)(annotationContext_1.default);
    const annotations = (0, react_1.useMemo)(() => {
        return context.annotations.filter((annotation) => !!annotation.nerAnnotation && annotation.page === pageNumber);
    }, [context, pageNumber]);
    const metrics = (0, react_1.useMemo)(() => (0, textMapHelpers_1.getTextMetrics)(text), [text]);
    const scale = (0, react_1.useMemo)(() => ({
        x: coords.width / metrics.width,
        y: coords.height / metrics.height,
    }), [metrics, coords]);
    const style = (0, react_1.useMemo)(() => {
        if (fontSize && transform && fontFamily) {
            return {
                left: `${coords.left}px`,
                top: `${coords.top}px`,
                fontSize: `${fontSize}px`,
                fontFamily: `${fontFamily}`,
                transform: `scaleX(${transform})`,
            };
        }
        return {
            left: `${coords.left}px`,
            top: `${coords.top}px`,
            width: `${coords.width}px`,
            height: `${coords.height}px`,
            font: '12px sans-serif',
            transform: `scale(${scale.x}, ${scale.y})`,
        };
    }, [fontSize, transform, fontFamily, coords.left, coords.top, coords.width, coords.height, scale.x, scale.y]);
    return (react_1.default.createElement("span", { className: "token-container", style: style }, tokens.map((token, keyIndex) => {
        const dataI = textLayerItem.dataI || offset + index + 1;
        const annotation = annotations.find((a) => a.nerAnnotation.textIds.includes(dataI));
        const tokenIndexIsNotFirstOrLast = (0, generalHelpers_1.isBetween)(keyIndex, 0, tokens.length - 1);
        if (token === ' ') {
            if (annotation && spaceAsMark && tokenIndexIsNotFirstOrLast) {
                spaceAsMark = false;
                return react_1.default.createElement(Mark_1.default, { key: keyIndex, token: token, annotation: annotation });
            }
            return react_1.default.createElement(Token_1.default, { key: keyIndex, token: token });
        }
        index += 1;
        if (annotation) {
            spaceAsMark = true;
            return react_1.default.createElement(Mark_1.default, { key: keyIndex, token: token, annotation: annotation });
        }
        return react_1.default.createElement(Token_1.default, { key: keyIndex, token: token, dataI: dataI });
    })));
};
exports.default = (0, react_1.memo)(TokenContainer);
