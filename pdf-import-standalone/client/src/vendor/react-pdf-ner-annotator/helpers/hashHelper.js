"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomHash = void 0;
const object_hash_1 = __importDefault(require("object-hash"));
const generateRandomHash = () => {
    const rand = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return (0, object_hash_1.default)({
        dateTime: new Date().toLocaleString(),
        rand,
    });
};
exports.generateRandomHash = generateRandomHash;
