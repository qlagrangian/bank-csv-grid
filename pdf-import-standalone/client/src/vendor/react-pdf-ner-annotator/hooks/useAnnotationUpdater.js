"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const useAnnotationUpdater = (actionHash, annotations, readonly, updateAnnotationsParent) => {
    const lastResolvedHash = (0, react_1.useRef)('');
    (0, react_1.useEffect)(() => {
        if (readonly) {
            return;
        }
        if (!useAnnotationUpdater) {
            return;
        }
        if (actionHash === lastResolvedHash.current) {
            return;
        }
        lastResolvedHash.current = actionHash;
        updateAnnotationsParent(annotations);
    }, [actionHash, readonly, updateAnnotationsParent, annotations]);
};
exports.default = useAnnotationUpdater;
