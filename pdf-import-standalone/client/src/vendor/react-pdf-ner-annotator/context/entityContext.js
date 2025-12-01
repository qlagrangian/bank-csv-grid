"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const EntityContext = (0, react_1.createContext)({
    entity: undefined,
});
EntityContext.displayName = 'EntityContext';
exports.default = EntityContext;
