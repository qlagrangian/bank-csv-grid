"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBetween = void 0;
const isBetween = (number, lowerbound, upperbound) => {
    return number > lowerbound && number < upperbound;
};
exports.isBetween = isBetween;
