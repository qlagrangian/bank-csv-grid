"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findIntersectingChildren = exports.calculateSelectionRectangle = exports.isCoordsEmpty = void 0;
const isCoordsEmpty = (coordinates) => {
    return coordinates.width * coordinates.height <= 25;
};
exports.isCoordsEmpty = isCoordsEmpty;
const calculateSelectionRectangle = (startPoint, endPoint) => {
    const x3 = Math.min(startPoint.x, endPoint.x);
    const x4 = Math.max(startPoint.x, endPoint.x);
    const y3 = Math.min(startPoint.y, endPoint.y);
    const y4 = Math.max(startPoint.y, endPoint.y);
    return { left: x3, top: y3, width: x4 - x3, height: y4 - y3 };
};
exports.calculateSelectionRectangle = calculateSelectionRectangle;
const findIntersectingChildren = (children, selectionRect, offsetX = 0, offsetY = 0) => {
    return Array.from(children).filter((child) => intersects(child, selectionRect, offsetX, offsetY));
};
exports.findIntersectingChildren = findIntersectingChildren;
const intersects = (child, selectionRect, offsetX, offsetY) => {
    if (Object.values(child.attributes)
        .map((value) => value.name)
        .includes('data-ignore')) {
        return false;
    }
    const leftX = Math.max(selectionRect.left, child.offsetLeft + offsetX);
    const rightX = Math.min(selectionRect.left + selectionRect.width, child.offsetLeft + offsetX + child.offsetWidth);
    const topY = Math.max(selectionRect.top, child.offsetTop + offsetY);
    const bottomY = Math.min(selectionRect.top + selectionRect.height, child.offsetTop + offsetY + child.offsetHeight);
    return leftX < rightX && topY < bottomY;
};
