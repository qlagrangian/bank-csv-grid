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
const configContext_1 = __importDefault(require("../context/configContext"));
const OFFSET = 15;
const CursorText = ({ entity, mouseCoords }) => {
    const { config } = (0, react_1.useContext)(configContext_1.default);
    const ref = (0, react_1.useRef)(null);
    const style = (0, react_1.useMemo)(() => {
        if (!entity || config.hideAnnotatingTooltips || !ref.current) {
            return {};
        }
        return {
            left: `${mouseCoords.x + OFFSET}px`,
            top: `${mouseCoords.y + OFFSET}px`,
            backgroundColor: entity.color,
        };
    }, [entity, config.hideAnnotatingTooltips, mouseCoords]);
    if (!entity || config.hideAnnotatingTooltips) {
        return null;
    }
    return (react_1.default.createElement("span", { className: "cursor-text", ref: ref, style: style }, entity.name));
};
exports.default = CursorText;
