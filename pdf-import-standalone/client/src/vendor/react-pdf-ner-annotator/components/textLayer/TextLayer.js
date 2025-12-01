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
const object_hash_1 = __importDefault(require("object-hash"));
const TokenContainer_1 = __importDefault(require("./TokenContainer"));
const annotationContext_1 = __importDefault(require("../../context/annotationContext"));
const textMapHelpers_1 = require("../../helpers/textMapHelpers");
const TextLayer = ({ inView, shouldRender, canvasInitialized, textLayer, needsTokenization, pageNumber }) => {
    const { tokenizer } = (0, react_1.useContext)(annotationContext_1.default);
    if (!shouldRender) {
        return null;
    }
    if (inView && canvasInitialized && (textLayer === null || textLayer === void 0 ? void 0 : textLayer.length)) {
        let offset = 0;
        return (react_1.default.createElement(react_1.default.Fragment, null, textLayer.map((textLayerItem) => {
            var _a;
            if (!((_a = textLayerItem.text) === null || _a === void 0 ? void 0 : _a.replace(/\s/g, ''))) {
                return null;
            }
            const tokens = (0, textMapHelpers_1.tokenizeText)(textLayerItem.text, tokenizer, needsTokenization);
            if (!tokens) {
                return null;
            }
            const filteredTokenLength = tokens.filter((t) => t !== ' ').length;
            offset += filteredTokenLength;
            return (react_1.default.createElement(TokenContainer_1.default, { key: (0, object_hash_1.default)(textLayerItem), textLayerItem: textLayerItem, tokens: tokens, offset: offset - filteredTokenLength, pageNumber: pageNumber }));
        })));
    }
    return null;
};
exports.default = (0, react_1.memo)(TextLayer);
