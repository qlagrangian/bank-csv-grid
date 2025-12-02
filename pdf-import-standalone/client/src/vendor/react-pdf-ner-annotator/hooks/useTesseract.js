"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sortBy_1 = __importDefault(require("lodash/sortBy"));
const react_1 = require("react");
const tesseract_js_1 = require("tesseract.js");
const pdfHelpers_1 = require("../helpers/pdfHelpers");
const useTesseract = (scale, context) => {
    const [ocrLoading, setOcrLoading] = (0, react_1.useState)(false);
    const [ocrError, setOcrError] = (0, react_1.useState)(undefined);
    const [ocrResult, setOcrResult] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (ocrResult && ocrResult.baseScale !== scale) {
            const rescaledWords = ocrResult.ocrWords.map((word) => {
                const coords = (0, pdfHelpers_1.recalculateBoundingBox)(word.coords, ocrResult.baseScale, scale);
                const fontSize = (0, pdfHelpers_1.calculateFontSize)(coords.width, coords.height, word.text);
                const transform = (0, pdfHelpers_1.calculateTransform)(coords.width, fontSize, word.fontFamily, word.text, context);
                return {
                    ...word,
                    coords,
                    fontSize,
                    transform,
                };
            });
            setOcrResult({
                ...ocrResult,
                ocrWords: rescaledWords,
                baseScale: scale,
            });
        }
    }, [ocrResult, scale, context]);
    const doOCR = (0, react_1.useCallback)(async (language = 'eng') => {
        setOcrLoading(true);
        try {
            // worker変数をここで定義して初期化する
            const worker = await (0, tesseract_js_1.createWorker)();
            // 言語のロードと初期化
            await worker.loadLanguage(language);
            await worker.initialize(language);
            // テキスト認識の実行
            const result = await worker.recognize(context.canvas);
            // 結果の処理
            setOcrError(undefined);
            setOcrLoading(false);
            const unsortedResult = result.data.words.map((word) => {
                const coords = (0, pdfHelpers_1.calculateRectangleProperties)(word.bbox);
                const fontSize = (0, pdfHelpers_1.calculateFontSize)(coords.width, coords.height, word.text);
                const fontFamily = word.font_name || 'sans-serif';
                const transform = (0, pdfHelpers_1.calculateTransform)(coords.width, fontSize, fontFamily, word.text, context);
                return {
                    coords,
                    text: word.text,
                    fontSize,
                    fontFamily,
                    transform,
                };
            });
            setOcrResult({
                confidence: result.data.confidence,
                ocrWords: (0, sortBy_1.default)(unsortedResult, ['coords.top', 'coords.left']),
                baseScale: scale,
            });
            // 使い終わったworkerを終了
            await worker.terminate();
            return result;
        }
        catch (error) {
            setOcrResult(null);
            setOcrLoading(false);
            setOcrError(error);
            throw error;
        }
    }, [scale, context]);
    return { ocrResult, ocrError, ocrLoading, doOCR };
};
exports.default = useTesseract;
