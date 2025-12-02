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
const usePDF_1 = __importDefault(require("./hooks/usePDF"));
const useAnnotations_1 = __importDefault(require("./hooks/useAnnotations"));
const useTextMap_1 = __importDefault(require("./hooks/useTextMap"));
const Page_1 = __importDefault(require("./components/Page"));
const Error_1 = __importDefault(require("./components/Error"));
const ButtonGroup_1 = __importDefault(require("./components/ButtonGroup"));
const EntityVisualisation_1 = __importDefault(require("./components/EntityVisualisation"));
const annotationContext_1 = __importDefault(require("./context/annotationContext"));
const configContext_1 = __importDefault(require("./context/configContext"));
const entityContext_1 = __importDefault(require("./context/entityContext"));
const useAnnotationUpdater_1 = __importDefault(require("./hooks/useAnnotationUpdater"));
const Annotator = (0, react_1.forwardRef)(({ config = {}, url, data, initialScale = 1.5, tokenizer = new RegExp(/.+/), entity, initialTextMap, defaultAnnotations = [], hoveredEntities, rotation = 0, // デフォルト値は0度（回転なし）
getAnnotations, getTextMaps, onLoadSuccess, }, ref) => {
    const [scale, setScale] = (0, react_1.useState)(initialScale);
    const { pages, error, fetchPage } = (0, usePDF_1.default)({ url, data, httpHeaders: config.httpHeaders });
    (0, react_1.useEffect)(() => {
        // pages が 0 より大きい有効な値になったら、親コンポーネントに通知
        if (pages > 0 && onLoadSuccess) {
            onLoadSuccess(pages);
        }
    }, [pages, onLoadSuccess]);
    const { annotations, getAnnotationsForPage, addAnnotation, updateAnnotation, updateLastAnnotationForEntity, removeAnnotation: deleteAnnotation, lastActionHash, } = (0, useAnnotations_1.default)(defaultAnnotations, config.readonly, config.shouldUpdateDefaultAnnotations);
    const { textMap, addPageToTextMap } = (0, useTextMap_1.default)(annotations);
    (0, useAnnotationUpdater_1.default)(lastActionHash, annotations, config.readonly, getAnnotations);
    (0, react_1.useImperativeHandle)(ref, () => ({ removeAnnotation }));
    const removeAnnotation = (id) => {
        deleteAnnotation(id);
    };
    (0, react_1.useEffect)(() => {
        if (getTextMaps) {
            getTextMaps(initialTextMap || textMap);
        }
    }, [textMap, initialTextMap, getTextMaps]);
    const style = (0, react_1.useMemo)(() => {
        if (config.hideAnnotatingEntityVisualizations) {
            return {};
        }
        if (entity) {
            return {
                border: `5px solid ${entity.color}`,
            };
        }
        return {};
    }, [entity, config]);
    const getTextLayerForPage = (0, react_1.useCallback)((page) => {
        if (initialTextMap) {
            const found = initialTextMap.find((layer) => layer.page === page);
            const shouldRender = found.shouldRender !== undefined ? found.shouldRender : true;
            return found ? [found.textMapItems, shouldRender] : [undefined, true];
        }
        return [undefined, true];
    }, [initialTextMap]);
    if (!url && !data) {
        return (react_1.default.createElement("div", { className: "annotator-container" },
            react_1.default.createElement("div", { className: "annotator-pages-container" },
                react_1.default.createElement("div", { className: "annotator-pages" },
                    react_1.default.createElement(Error_1.default, { message: "You need to provide either valid PDF data or a URL to a PDF" })))));
    }
    if (error) {
        return (react_1.default.createElement("div", { className: "annotator-container" },
            react_1.default.createElement("div", { className: "annotator-pages-container" },
                react_1.default.createElement("div", { className: "annotator-pages" },
                    react_1.default.createElement(Error_1.default, null)))));
    }
    return (react_1.default.createElement(configContext_1.default.Provider, { value: { config } },
        react_1.default.createElement("div", { className: "annotator-container", style: style },
            react_1.default.createElement(EntityVisualisation_1.default, { entity: entity }),
            react_1.default.createElement("div", { className: "annotator-pages-container" },
                react_1.default.createElement(entityContext_1.default.Provider, { value: { entity } },
                    react_1.default.createElement(annotationContext_1.default.Provider, { value: {
                            annotations,
                            removeAnnotation,
                            updateAnnotation,
                            tokenizer,
                            hoveredEntities,
                        } },
                        react_1.default.createElement("div", { className: "annotator-pages" }, Array(pages)
                            .fill(0)
                            .map((_, index) => {
                            const key = `pdf-page-${index}`;
                            const pageNumber = index + 1;
                            const page = fetchPage(pageNumber);
                            const [initialTextLayer, shouldRender] = getTextLayerForPage(pageNumber);
                            return (react_1.default.createElement(Page_1.default, { shouldRender: shouldRender, page: page, scale: scale, rotation: rotation, key: key, pageNumber: pageNumber, annotations: getAnnotationsForPage(pageNumber), addAnnotation: addAnnotation, updateLastAnnotationForEntity: updateLastAnnotationForEntity, addPageToTextMap: addPageToTextMap, initialTextLayer: initialTextLayer }));
                        }))))),
            react_1.default.createElement(ButtonGroup_1.default, { scale: scale, setScale: setScale }))));
});
exports.default = (0, react_1.memo)(Annotator);
