"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unavailableOrMisconfiguredError = exports.mapRange = exports.coerceStringArray = exports.coerceNumber = exports.isNumberValue = exports.renderError = exports.getChildConnections = exports.getEntityId = exports.normalizeStateValue = exports.formatState = exports.cloneObj = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
var custom_card_helpers_1 = require("custom-card-helpers");
var lit_1 = require("lit");
var const_1 = require("../const");
var logging_1 = require("../logging");
function cloneObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}
exports.cloneObj = cloneObj;
function formatState(state, round) {
    var rounded;
    var decimals = round;
    do {
        // round to first significant digit
        rounded = state.toFixed(decimals++);
    } while (/^[0\.]*$/.test(rounded) && decimals < 100);
    var formattedState = parseFloat(rounded).toLocaleString();
    return formattedState;
}
exports.formatState = formatState;
function normalizeStateValue(unit_prefix, state, unit_of_measurement) {
    var validState = Math.max(0, state);
    if (!unit_of_measurement) {
        return { state: validState, unit_of_measurement: unit_of_measurement };
    }
    var prefix = Object.keys(const_1.UNIT_PREFIXES).find(function (p) { return unit_of_measurement.indexOf(p) === 0; }) || '';
    var currentFactor = const_1.UNIT_PREFIXES[prefix] || 1;
    var targetFactor = const_1.UNIT_PREFIXES[unit_prefix] || 1;
    if (currentFactor === targetFactor) {
        return { state: validState, unit_of_measurement: unit_of_measurement };
    }
    return {
        state: (validState * currentFactor) / targetFactor,
        unit_of_measurement: prefix ? unit_of_measurement.replace(prefix, unit_prefix) : unit_prefix + unit_of_measurement,
    };
}
exports.normalizeStateValue = normalizeStateValue;
function getEntityId(entity) {
    return typeof entity === 'string' ? entity : entity.entity_id;
}
exports.getEntityId = getEntityId;
function getChildConnections(parent, children, connections) {
    // @NOTE don't take prevParentState from connection because it is different
    var prevParentState = 0;
    return children.map(function (child) {
        var connection = connections === null || connections === void 0 ? void 0 : connections.find(function (c) { return c.child.entity_id === child.entity_id; });
        if (!connection) {
            throw new Error("Missing connection: ".concat(parent.entity_id, " - ").concat(child.entity_id));
        }
        var state = connection.state, prevChildState = connection.prevChildState;
        if (state <= 0) {
            // only continue if this connection will be rendered
            return { state: state };
        }
        var startY = (prevParentState / parent.state) * parent.size + parent.top;
        prevParentState += state;
        var startSize = Math.max((state / parent.state) * parent.size, 0);
        var endY = (prevChildState / child.state) * child.size + child.top;
        var endSize = Math.max((state / child.state) * child.size, 0);
        return {
            startY: startY,
            startSize: startSize,
            startColor: parent.color,
            endY: endY,
            endSize: endSize,
            endColor: child.color,
            state: state,
            highlighted: connection.highlighted,
        };
    });
}
exports.getChildConnections = getChildConnections;
// private _showWarning(warning: string): TemplateResult {
//   return html`
//     <hui-warning>${warning}</hui-warning>
//   `;
// }
function renderError(error, origConfig, hass) {
    return __awaiter(this, void 0, void 0, function () {
        var config, element, HELPERS;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config = {
                        type: 'error',
                        error: error,
                        origConfig: origConfig,
                    };
                    HELPERS = window.loadCardHelpers ? window.loadCardHelpers() : undefined;
                    if (!HELPERS) return [3 /*break*/, 2];
                    return [4 /*yield*/, HELPERS];
                case 1:
                    element = (_a.sent()).createCardElement(config);
                    return [3 /*break*/, 3];
                case 2:
                    element = (0, custom_card_helpers_1.createThing)(config);
                    _a.label = 3;
                case 3:
                    if (hass) {
                        element.hass = hass;
                    }
                    return [2 /*return*/, (0, lit_1.html)(templateObject_1 || (templateObject_1 = __makeTemplateObject([" ", " "], [" ", " "])), element)];
            }
        });
    });
}
exports.renderError = renderError;
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function isNumberValue(value) {
    // parseFloat(value) handles most of the cases we're interested in (it treats null, empty string,
    // and other non-number values as NaN, where Number just uses 0) but it considers the string
    // '123hello' to be a valid number. Therefore we also check if Number(value) is NaN.
    // eslint-disable-next-line no-restricted-globals
    return !isNaN(parseFloat(value)) && !isNaN(Number(value));
}
exports.isNumberValue = isNumberValue;
function coerceNumber(value, fallbackValue) {
    if (fallbackValue === void 0) { fallbackValue = 0; }
    return isNumberValue(value) ? Number(value) : fallbackValue;
}
exports.coerceNumber = coerceNumber;
function coerceStringArray(value, separator) {
    if (separator === void 0) { separator = /\s+/; }
    var result = [];
    if (value != null) {
        var sourceValues = Array.isArray(value)
            ? value
            : "".concat(value).split(separator);
        for (var _i = 0, sourceValues_1 = sourceValues; _i < sourceValues_1.length; _i++) {
            var sourceValue = sourceValues_1[_i];
            var trimmedString = "".concat(sourceValue).trim();
            if (trimmedString) {
                result.push(trimmedString);
            }
        }
    }
    return result;
}
exports.coerceStringArray = coerceStringArray;
var mapRange = function (value, minOut, maxOut, minIn, maxIn) {
    if (value > maxIn) {
        return maxOut;
    }
    return ((value - minIn) * (maxOut - minOut)) / (maxIn - minIn) + minOut;
};
exports.mapRange = mapRange;
var unavailableOrMisconfiguredError = function (entityId) { return (0, logging_1.logError)("Entity \"".concat(entityId !== null && entityId !== void 0 ? entityId : "Unknown", "\" is not available or misconfigured")); };
exports.unavailableOrMisconfiguredError = unavailableOrMisconfiguredError;
var templateObject_1;
//# sourceMappingURL=index.js.map