"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const object_hash_1 = __importDefault(require("object-hash"));
const hashHelper_1 = require("../helpers/hashHelper");
const useAnnotations = (defaultAnnotations, readonly, shouldUpdateDefaultAnnotations) => {
    const [annotations, setAnnotations] = (0, react_1.useState)([]);
    const [lastActionHash, setLastActionHash] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (shouldUpdateDefaultAnnotations) {
            setAnnotations(defaultAnnotations);
        }
    }, [defaultAnnotations, shouldUpdateDefaultAnnotations, (0, object_hash_1.default)(defaultAnnotations)]);
    const getAnnotationsForPage = (0, react_1.useCallback)((page) => {
        return annotations.filter((annotation) => annotation.page === page);
    }, [annotations]);
    const addAnnotation = (0, react_1.useCallback)((annotation) => {
        if (readonly) {
            return;
        }
        setAnnotations((prevAnnotations) => {
            var _a;
            const lastId = ((_a = prevAnnotations[prevAnnotations.length - 1]) === null || _a === void 0 ? void 0 : _a.id) || 0;
            const newAnnotation = {
                id: lastId + 1,
                ...annotation,
            };
            return [...prevAnnotations, newAnnotation];
        });
        setLastActionHash((0, hashHelper_1.generateRandomHash)());
    }, [readonly]);
    const updateAnnotation = (0, react_1.useCallback)((annotation) => {
        if (readonly) {
            return;
        }
        setAnnotations((prevAnnotations) => prevAnnotations.map((prevAnnotation) => {
            if (prevAnnotation.id === annotation.id) {
                return annotation;
            }
            return prevAnnotation;
        }));
        setLastActionHash((0, hashHelper_1.generateRandomHash)());
    }, [readonly]);
    const updateLastAnnotationForEntity = (0, react_1.useCallback)((annotation) => {
        if (readonly) {
            return;
        }
        const lastAnnotationForEntity = annotations
            .slice()
            .reverse()
            .find((x) => x.entity.id === annotation.entity.id && x.index === annotation.index);
        if (lastAnnotationForEntity) {
            const updatedAnnotations = [...annotations].map((x) => {
                if (x.id === lastAnnotationForEntity.id) {
                    return {
                        ...x,
                        nerAnnotation: {
                            ...x.nerAnnotation,
                            tokens: [...x.nerAnnotation.tokens, ...annotation.nerAnnotation.tokens],
                            textIds: [...x.nerAnnotation.textIds, ...annotation.nerAnnotation.textIds],
                        },
                    };
                }
                return x;
            });
            setAnnotations(updatedAnnotations);
        }
        else {
            addAnnotation(annotation);
        }
        setLastActionHash((0, hashHelper_1.generateRandomHash)());
    }, [addAnnotation, annotations, readonly]);
    const removeAnnotation = (0, react_1.useCallback)((id) => {
        if (readonly) {
            return;
        }
        setAnnotations((prevAnnotations) => prevAnnotations.filter((a) => a.id !== id));
        setLastActionHash((0, hashHelper_1.generateRandomHash)());
    }, [readonly]);
    return {
        annotations,
        getAnnotationsForPage,
        addAnnotation,
        updateAnnotation,
        updateLastAnnotationForEntity,
        removeAnnotation,
        lastActionHash,
    };
};
exports.default = useAnnotations;
