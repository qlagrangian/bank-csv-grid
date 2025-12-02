"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const Loader = () => (react_1.default.createElement("div", { className: "loader-container" },
    react_1.default.createElement("div", { className: "loader__lds-roller" },
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", null))));
exports.default = Loader;
