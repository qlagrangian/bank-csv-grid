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
const annotationContext_1 = __importDefault(require("../../context/annotationContext"));
const Mark = ({ token, annotation }) => {
    const { removeAnnotation, hoveredEntities } = (0, react_1.useContext)(annotationContext_1.default);
    const style = (0, react_1.useMemo)(() => {
        if (!(hoveredEntities === null || hoveredEntities === void 0 ? void 0 : hoveredEntities.length)) {
            return {
                backgroundColor: annotation.entity.color,
            };
        }
        if (hoveredEntities.some((hoveredEntity) => hoveredEntity.id === annotation.entity.id && hoveredEntity.index === annotation.index)) {
            return {
                backgroundColor: annotation.entity.color,
            };
        }
        return {
            backgroundColor: "#d3d3d3",
        };
    }, [hoveredEntities]);
    return (react_1.default.createElement("mark", { className: "mark-container", onClick: () => removeAnnotation(annotation.id), style: style },
        react_1.default.createElement("span", { className: "mark__token" }, token)));
};
exports.default = (0, react_1.memo)(Mark);
