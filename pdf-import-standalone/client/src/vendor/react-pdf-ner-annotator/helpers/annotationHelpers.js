"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAreaAnnotation = exports.buildNerAnnotation = void 0;
const selectionHelpers_1 = require("./selectionHelpers");
const getImageAsBase64 = (targetCoords, context) => {
    const { left, top, width, height } = targetCoords;
    const imageContentRaw = context.getImageData(left, top, width, height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').putImageData(imageContentRaw, 0, 0);
    return canvas.toDataURL('image/jpeg', 1.0);
};
const buildNerAnnotation = (pageNumber, entity, selectionChildren, targetCoords) => {
    const intersects = (0, selectionHelpers_1.findIntersectingChildren)(selectionChildren, targetCoords);
    const markToAdd = {
        page: pageNumber,
        nerAnnotation: {
            tokens: [],
            textIds: [],
        },
        entity: entity,
        index: entity.index,
    };
    intersects.forEach((intersect) => {
        const offsetX = intersect.offsetLeft;
        const offsetY = intersect.offsetTop;
        (0, selectionHelpers_1.findIntersectingChildren)(intersect.children, targetCoords, offsetX, offsetY).forEach((child, index) => {
            const dataI = child.getAttribute('data-i');
            if (dataI) {
                markToAdd.nerAnnotation.tokens.push(child.textContent);
                markToAdd.nerAnnotation.textIds.push(parseInt(dataI, 10));
            }
        });
    });
    return markToAdd;
};
exports.buildNerAnnotation = buildNerAnnotation;
const buildAreaAnnotation = (pageNumber, entity, targetCoords, pdfInformation, context) => {
    if ((0, selectionHelpers_1.isCoordsEmpty)(targetCoords)) {
        return null;
    }
    return {
        page: pageNumber,
        areaAnnotation: {
            boundingBox: targetCoords,
            pdfInformation,
            base64Image: getImageAsBase64(targetCoords, context),
        },
        entity: entity,
    };
};
exports.buildAreaAnnotation = buildAreaAnnotation;
