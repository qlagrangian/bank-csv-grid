"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const AnnotationContext = (0, react_1.createContext)({
    annotations: [],
    removeAnnotation: () => { },
    updateAnnotation: () => { },
    tokenizer: new RegExp(/.+/),
});
AnnotationContext.displayName = 'AnnotationContext';
exports.default = AnnotationContext;
