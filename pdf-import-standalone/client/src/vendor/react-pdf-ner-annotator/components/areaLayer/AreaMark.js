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
const AreaTextAnnotation_1 = __importDefault(require("./AreaTextAnnotation"));
const pdfHelpers_1 = require("../../helpers/pdfHelpers");
const AreaAnnotationToggle_1 = __importDefault(require("./AreaAnnotationToggle"));
const AreaMark = ({ pdfScale, annotation, removeAnnotation, updateAnnotation }) => {
    const [showInput, setShowInput] = (0, react_1.useState)(true);
    const { areaAnnotation: { boundingBox: bb, pdfInformation: { scale }, }, } = annotation;
    const boundingBox = (0, react_1.useMemo)(() => (0, pdfHelpers_1.recalculateBoundingBox)(bb, scale, pdfScale), [bb, scale, pdfScale]);
    return (react_1.default.createElement("div", { className: "area-annotation__container", style: {
            left: `${boundingBox.left}px`,
            top: `${boundingBox.top - 35}px`,
            width: `${boundingBox.width}px`,
            height: `${boundingBox.height + 35}px`,
        } },
        react_1.default.createElement(AreaTextAnnotation_1.default, { showInput: showInput, annotation: annotation, updateAnnotation: updateAnnotation }),
        react_1.default.createElement("div", { role: "button", "aria-label": "Area annotation", onClick: () => removeAnnotation(annotation.id), className: "area-annotation__mark", style: {
                width: `${boundingBox.width}px`,
                height: `${boundingBox.height}px`,
                border: `2px solid ${annotation.entity.color}`,
            } },
            react_1.default.createElement(AreaAnnotationToggle_1.default, { showInput: showInput, setShowInput: setShowInput }),
            react_1.default.createElement("span", { style: { backgroundColor: annotation.entity.color } }))));
};
exports.default = AreaMark;
