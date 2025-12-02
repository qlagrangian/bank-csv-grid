"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const eye_svg_1 = __importDefault(require("../../assets/icons/eye.svg"));
const eye_slash_svg_1 = __importDefault(require("../../assets/icons/eye-slash.svg"));
const AreaAnnotationToggle = ({ showInput, setShowInput }) => {
    return (react_1.default.createElement("img", { src: showInput ? eye_svg_1.default : eye_slash_svg_1.default, alt: "Toggle button", className: "area-annotation__toggle-icon", onClick: (event) => {
            event.stopPropagation();
            setShowInput(!showInput);
        } }));
};
exports.default = AreaAnnotationToggle;
