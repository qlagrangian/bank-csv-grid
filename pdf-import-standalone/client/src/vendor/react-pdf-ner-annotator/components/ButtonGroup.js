"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const plus_svg_1 = __importDefault(require("../assets/icons/plus.svg"));
const dash_svg_1 = __importDefault(require("../assets/icons/dash.svg"));
const ButtonGroup = ({ scale, setScale }) => {
    const incrementScale = (increment) => {
        const newScale = Math.round((scale + increment) * 10) / 10;
        if (newScale <= 5.0 && newScale >= 0.5) {
            setScale(newScale);
        }
    };
    return (react_1.default.createElement("nav", { className: "fab-group-container" },
        react_1.default.createElement("ul", { className: "fab-group__list" },
            react_1.default.createElement("li", { className: "fab-group__list-item" },
                react_1.default.createElement("span", { role: "button", className: "fab-group__button", onClick: () => incrementScale(0.1) },
                    react_1.default.createElement("img", { className: "fab-group__button-icon", src: plus_svg_1.default, alt: "Zoom in" }))),
            react_1.default.createElement("li", { className: "fab-group__list-item" },
                react_1.default.createElement("span", { role: "button", className: "fab-group__button", onClick: () => incrementScale(-0.1) },
                    react_1.default.createElement("img", { className: "fab-group__button-icon", src: dash_svg_1.default, alt: "Zoom out" }))))));
};
exports.default = ButtonGroup;
