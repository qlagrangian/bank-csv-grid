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
const react_intersection_observer_1 = require("react-intersection-observer");
const pdfHelpers_1 = require("../helpers/pdfHelpers");
const textLayer_1 = require("../interfaces/textLayer");
const useTesseract_1 = __importDefault(require("../hooks/useTesseract"));
const useTextLayer_1 = __importDefault(require("../hooks/useTextLayer"));
const Selection_1 = __importDefault(require("./Selection"));
const OcrInfo_1 = __importDefault(require("./OcrInfo"));
const Loader_1 = __importDefault(require("./Loader"));
const TextLayer_1 = __importDefault(require("./textLayer/TextLayer"));
const AreaLayer_1 = __importDefault(require("./areaLayer/AreaLayer"));
const configContext_1 = __importDefault(require("../context/configContext"));
const annotationContext_1 = __importDefault(require("../context/annotationContext"));
const Page = ({ pageNumber, shouldRender, page, scale, rotation, annotations, addAnnotation, updateLastAnnotationForEntity, addPageToTextMap, initialTextLayer, }) => {
    const { config: { disableOCR }, } = (0, react_1.useContext)(configContext_1.default);
    const { tokenizer } = (0, react_1.useContext)(annotationContext_1.default);
    const [inViewRef, inView] = (0, react_intersection_observer_1.useInView)({ threshold: 0 });
    const canvasRef = (0, react_1.useRef)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [pdfPage, setPdfPage] = (0, react_1.useState)(null);
    const [context, setContext] = (0, react_1.useState)(null);
    const [startOcr, setStartOcr] = (0, react_1.useState)(false);
    const [pageViewport, setPageViewport] = (0, react_1.useState)({ width: (916 / 1.5) * scale, height: (1174 / 1.5) * scale });
    const { textLayer, buildTextLayer } = (0, useTextLayer_1.default)(scale, context, initialTextLayer);
    const { ocrResult, ocrError, ocrLoading, doOCR } = (0, useTesseract_1.default)(scale, context);
    const message = ocrResult ? `OCR confidence ${ocrResult.confidence}%` : undefined;
    (0, react_1.useEffect)(() => {
        if (annotations.length) {
            if (textLayer) {
                addPageToTextMap(pageNumber, textLayer, textLayer_1.TextLayerType.TEXT_LAYER, 1, tokenizer);
                return;
            }
            if (ocrResult) {
                addPageToTextMap(pageNumber, ocrResult.ocrWords, textLayer_1.TextLayerType.ORC, ocrResult.confidence);
            }
        }
    }, [annotations, textLayer, ocrResult, pageNumber, addPageToTextMap, tokenizer]);
    (0, react_1.useEffect)(() => {
        if (!disableOCR && startOcr && inView && !ocrResult) {
            doOCR();
        }
    }, [disableOCR, startOcr, inView, doOCR, ocrResult]);
    (0, react_1.useEffect)(() => {
        if (canvasRef) {
            setContext(canvasRef.current.getContext('2d'));
        }
    }, [canvasRef]);
    (0, react_1.useEffect)(() => {
        if (canvasRef && context && page && inView) {
            page.then((pdfPageResult) => {
                // 回転角度を適用したビューポートを作成
                const viewport = pdfPageResult.getViewport({ scale, rotation: rotation || 0 });
                const { width, height } = viewport;
                setPageViewport(viewport);
                const canvas = canvasRef.current;
                canvas.width = width;
                canvas.height = height;
                pdfPageResult
                    .render({
                    canvasContext: context,
                    viewport,
                })
                    .promise.then(() => {
                    setPdfPage(pdfPageResult);
                });
            });
        }
    }, [page, scale, rotation, canvasRef, context, inView]);
    (0, react_1.useEffect)(() => {
        if (textLayer === null || textLayer === void 0 ? void 0 : textLayer.length) {
            setLoading(false);
            return;
        }
        if (inView && pdfPage && !textLayer) {
            pdfPage.getTextContent().then((content) => {
                if (content.items.length) {
                    const contentMerged = (0, pdfHelpers_1.mergeSplitWords)(content);
                    buildTextLayer(contentMerged, pageViewport);
                }
                else {
                    setStartOcr(true);
                }
                setLoading(false);
            });
        }
    }, [inView, pdfPage, pageViewport, context, page, textLayer, buildTextLayer]);
    return (react_1.default.createElement("div", { className: "page", ref: inViewRef },
        react_1.default.createElement("div", { className: "page__container", style: { width: `${pageViewport.width}px`, height: `${pageViewport.height}px` } },
            react_1.default.createElement("div", { className: "page__canvas-container", style: { width: `${pageViewport.width}px`, height: `${pageViewport.height}px` } },
                loading ? react_1.default.createElement(Loader_1.default, null) : null,
                react_1.default.createElement("canvas", { ref: canvasRef, style: { width: `${pageViewport.width}px`, height: `${pageViewport.height}px` } })),
            react_1.default.createElement(Selection_1.default, { pageNumber: pageNumber, className: "page__text-layer-container", style: { width: `${pageViewport.width}px`, height: `${pageViewport.height}px` }, addAnnotation: addAnnotation, updateLastAnnotationForEntity: updateLastAnnotationForEntity, pdfInformation: { width: pageViewport.width, height: pageViewport.height, scale }, pdfContext: context },
                react_1.default.createElement(TextLayer_1.default, { inView: inView, shouldRender: shouldRender, canvasInitialized: !!canvasRef, textLayer: textLayer || (ocrResult === null || ocrResult === void 0 ? void 0 : ocrResult.ocrWords), pageNumber: pageNumber, needsTokenization: !initialTextLayer }),
                react_1.default.createElement(AreaLayer_1.default, { pdfScale: scale, pageNumber: pageNumber }),
                react_1.default.createElement("div", { className: "ocr-info-container" },
                    react_1.default.createElement(OcrInfo_1.default, { loading: ocrLoading, message: message, error: ocrError }))))));
};
exports.default = (0, react_1.memo)(Page);
