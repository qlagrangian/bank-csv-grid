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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
// @ts-ignore
const PdfJs = __importStar(require("pdfjs-dist/build/pdf.min"));
// @ts-ignore
const PdfWorker = __importStar(require("pdfjs-dist/build/pdf.worker.entry"));
const baseHeaders = {
    Accept: 'application/pdf',
};
const usePDF = ({ url, data, httpHeaders }) => {
    PdfJs.GlobalWorkerOptions.workerSrc = PdfWorker;
    const [pages, setPages] = (0, react_1.useState)(0);
    const [document, setDocument] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setPages(0);
        setDocument(null);
        setError(true);
        const pdfParams = {
            url,
            httpHeaders: {
                ...baseHeaders,
                ...httpHeaders,
            },
        };
        PdfJs.getDocument(url ? pdfParams : data)
            .promise.then((pdf) => {
            setPages(pdf.numPages);
            setDocument(pdf);
            setError(false);
        })
            .catch(() => {
            setPages(0);
            setDocument(null);
            setError(true);
        });
    }, [url, data, httpHeaders]);
    const fetchPage = (0, react_1.useCallback)((index) => {
        if (document) {
            return document.getPage(index);
        }
        return null;
    }, [document]);
    return { pages, error, fetchPage };
};
exports.default = usePDF;
