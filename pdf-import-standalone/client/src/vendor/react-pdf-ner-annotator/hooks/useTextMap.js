"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const textMapHelpers_1 = require("../helpers/textMapHelpers");
const useTextMap = (annotations) => {
    const [textMap, setTextMap] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const pagesWithAnnotations = Array.from(new Set(annotations.map((annotation) => annotation.page)).values());
        const textMapCleaned = textMap.filter((textMapItem) => pagesWithAnnotations.includes(textMapItem.page));
        if (textMapCleaned.length < textMap.length) {
            setTextMap(textMapCleaned);
        }
    }, [annotations, textMap]);
    const addPageToTextMap = (0, react_1.useCallback)((page, pdfTextLayer, type, confidence, tokenizer) => {
        if (!textMap.find((textMapItem) => textMapItem.page === page)) {
            const newTextMap = [
                ...textMap,
                { page, textMapItems: (0, textMapHelpers_1.buildTextMapFromTextLayer)(pdfTextLayer, type, tokenizer), type, confidence },
            ];
            setTextMap(newTextMap);
        }
    }, [textMap]);
    return { textMap, addPageToTextMap };
};
exports.default = useTextMap;
