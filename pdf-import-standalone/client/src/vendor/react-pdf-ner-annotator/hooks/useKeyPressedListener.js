"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const useKeyPressedListener = (targetKey = 'CONTROL') => {
    const [keyPressed, setKeyPressed] = (0, react_1.useState)(false);
    const getTargetKeys = (0, react_1.useCallback)(() => {
        if (targetKey.toUpperCase() === 'CONTROL' || targetKey.toUpperCase() === 'META') {
            return ['CONTROL', 'META'];
        }
        return [targetKey.toUpperCase()];
    }, [targetKey]);
    const downHandler = (0, react_1.useCallback)(({ key }) => {
        if (getTargetKeys().includes(key === null || key === void 0 ? void 0 : key.toUpperCase())) {
            setKeyPressed(true);
        }
    }, [getTargetKeys]);
    const upHandler = (0, react_1.useCallback)(({ key }) => {
        if (getTargetKeys().includes(key === null || key === void 0 ? void 0 : key.toUpperCase())) {
            setKeyPressed(false);
        }
    }, [getTargetKeys]);
    (0, react_1.useEffect)(() => {
        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);
        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, [downHandler, upHandler]);
    return keyPressed;
};
exports.default = useKeyPressedListener;
