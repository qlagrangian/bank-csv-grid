"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const error_svg_1 = __importDefault(require("../assets/icons/error.svg"));
const Error = ({ message = 'Something went wrong.' }) => {
    return (react_1.default.createElement("div", { className: "error-container" },
        react_1.default.createElement("img", { className: "error-image", src: error_svg_1.default, alt: "Error" }),
        react_1.default.createElement("span", { className: "error-message" }, message)));
};
exports.default = Error;
