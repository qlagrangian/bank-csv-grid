"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const arrow_repeat_svg_1 = __importDefault(require("../assets/icons/arrow-repeat.svg"));
const exclamation_circle_svg_1 = __importDefault(require("../assets/icons/exclamation-circle.svg"));
const check_circle_svg_1 = __importDefault(require("../assets/icons/check-circle.svg"));
const Tooltip_1 = __importDefault(require("./Tooltip"));
const OcrInfo = ({ loading, error, message }) => {
    if (loading) {
        return (react_1.default.createElement(Tooltip_1.default, { message: "OCR is running..." },
            react_1.default.createElement("img", { src: arrow_repeat_svg_1.default, className: "ocr-info__icon ocr-info__icon-rotate", alt: "loading icon" })));
    }
    if (error) {
        return (react_1.default.createElement(Tooltip_1.default, { message: error },
            react_1.default.createElement("img", { src: exclamation_circle_svg_1.default, className: "ocr-info__icon", alt: "error icon" })));
    }
    if (message) {
        return (react_1.default.createElement(Tooltip_1.default, { message: message },
            react_1.default.createElement("img", { src: check_circle_svg_1.default, className: "ocr-info__icon", alt: "check icon" })));
    }
    return null;
};
exports.default = OcrInfo;
