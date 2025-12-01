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
const mouse_position_1 = __importDefault(require("@react-hook/mouse-position"));
const selectionHelpers_1 = require("../helpers/selectionHelpers");
const SelectionRectangle_1 = __importDefault(require("./SelectionRectangle"));
const annotationHelpers_1 = require("../helpers/annotationHelpers");
const useKeyPressedListener_1 = __importDefault(require("../hooks/useKeyPressedListener"));
const CursorText_1 = __importDefault(require("./CursorText"));
const entityContext_1 = __importDefault(require("../context/entityContext"));
const initialCoords = { left: 0, top: 0, width: 0, height: 0 };
const Selection = ({ pageNumber, children, addAnnotation, updateLastAnnotationForEntity, className, style, pdfInformation, pdfContext, }) => {
    const selectionRef = (0, react_1.useRef)(null);
    const mouse = (0, mouse_position_1.default)(selectionRef);
    const keyPressed = (0, useKeyPressedListener_1.default)();
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [mouseCoords, setMouseCoords] = (0, react_1.useState)({ x: 0, y: 0 });
    const [coords, setCoords] = (0, react_1.useState)(initialCoords);
    const { entity } = (0, react_1.useContext)(entityContext_1.default);
    const mode = (0, react_1.useMemo)(() => {
        if (entity && isDragging) {
            return 'annotating-mode';
        }
        if (entity) {
            return 'normal-mode';
        }
        return 'text-selection-mode';
    }, [entity, isDragging]);
    const handleKeyEvent = (0, react_1.useCallback)((event) => {
        var _a;
        if (((_a = event === null || event === void 0 ? void 0 : event.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'escape' && isDragging) {
            setIsDragging(false);
            setMouseCoords({ x: 0, y: 0 });
            setCoords(initialCoords);
        }
    }, [isDragging]);
    (0, react_1.useEffect)(() => {
        document.addEventListener('keydown', handleKeyEvent, false);
        return () => {
            document.removeEventListener('keydown', handleKeyEvent, false);
        };
    }, [handleKeyEvent]);
    const handleMouseDown = (0, react_1.useCallback)(() => {
        if (entity) {
            const { x, y } = mouse;
            setMouseCoords({ x: x, y: y });
            setIsDragging(true);
        }
    }, [entity, mouse]);
    const handleMouseUp = (0, react_1.useCallback)(() => {
        if (selectionRef && entity) {
            let coordsToUse = coords;
            if ((0, selectionHelpers_1.isCoordsEmpty)(coords) && entity.entityType === 'NER') {
                const { x, y } = mouse;
                coordsToUse = { left: x, top: y, width: 1, height: 1 };
            }
            switch (entity.entityType) {
                case 'NER': {
                    const { children: selectionChildren } = selectionRef.current;
                    const markToAdd = (0, annotationHelpers_1.buildNerAnnotation)(pageNumber, entity, selectionChildren, coordsToUse);
                    if (markToAdd.nerAnnotation.textIds.length) {
                        if (keyPressed) {
                            updateLastAnnotationForEntity(markToAdd);
                        }
                        else {
                            addAnnotation(markToAdd);
                        }
                    }
                    break;
                }
                case 'AREA': {
                    const areaToAdd = (0, annotationHelpers_1.buildAreaAnnotation)(pageNumber, entity, coordsToUse, pdfInformation, pdfContext);
                    if (areaToAdd) {
                        addAnnotation(areaToAdd);
                    }
                    break;
                }
                default:
                    break;
            }
        }
        setIsDragging(false);
        setMouseCoords({ x: 0, y: 0 });
        setCoords(initialCoords);
    }, [
        entity,
        coords,
        mouse,
        pageNumber,
        keyPressed,
        updateLastAnnotationForEntity,
        addAnnotation,
        pdfInformation,
        pdfContext,
    ]);
    const handleMouseMove = (0, react_1.useCallback)(() => {
        if (isDragging && entity) {
            const { x, y } = mouse;
            setCoords((0, selectionHelpers_1.calculateSelectionRectangle)(mouseCoords, { x: x, y: y }));
        }
    }, [isDragging, entity, mouse, mouseCoords]);
    return (react_1.default.createElement("div", { role: "document", ref: selectionRef, className: `selection-container ${className} ${mode}`, style: style, onMouseDown: handleMouseDown, onMouseUp: handleMouseUp, onMouseMove: handleMouseMove },
        react_1.default.createElement(CursorText_1.default, { entity: entity, mouseCoords: { x: mouse === null || mouse === void 0 ? void 0 : mouse.x, y: mouse === null || mouse === void 0 ? void 0 : mouse.y } }),
        react_1.default.createElement(SelectionRectangle_1.default, { isDragging: isDragging, coordinates: coords }),
        children));
};
exports.default = Selection;
