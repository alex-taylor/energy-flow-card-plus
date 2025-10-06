"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEntityStatistics = exports.getEntityStateWattHours = exports.getEntityState = exports.getEntityStateObj = exports.entityAvailable = exports.entityExists = void 0;
var custom_card_helpers_1 = require("custom-card-helpers");
var utils_1 = require("../utils");
var entityExists = function (hass, entityId) { return entityId in hass.states; };
exports.entityExists = entityExists;
var entityAvailable = function (hass, entityId) { var _a; return (0, utils_1.isNumberValue)((_a = hass.states[entityId]) === null || _a === void 0 ? void 0 : _a.state); };
exports.entityAvailable = entityAvailable;
var getEntityStateObj = function (hass, entity) {
    if (!entity || !(0, exports.entityAvailable)(hass, entity)) {
        (0, utils_1.unavailableOrMisconfiguredError)(entity);
        return undefined;
    }
    return hass.states[entity];
};
exports.getEntityStateObj = getEntityStateObj;
var getEntityState = function (hass, entity) {
    var _a;
    return (0, utils_1.coerceNumber)(((_a = (0, exports.getEntityStateObj)(hass, entity)) === null || _a === void 0 ? void 0 : _a.state) || 0);
};
exports.getEntityState = getEntityState;
var getEntityStateWattHours = function (hass, displayMode, periodStart, periodEnd, statistics, entity) {
    if (!statistics || !entity) {
        return 0;
    }
    var entityStatistics = getEntityStatistics(hass, displayMode, periodStart, periodEnd, statistics, entity);
    var sum = 0;
    entityStatistics.forEach(function (value, key) {
        sum += value;
    });
    return sum;
};
exports.getEntityStateWattHours = getEntityStateWattHours;
function getEntityStatistics(hass, displayMode, periodStart, periodEnd, statistics, entity) {
    var result = new Map();
    var entityArr = [];
    if (typeof entity === "string") {
        entityArr.push(entity);
    }
    else if (Array.isArray(entity)) {
        entityArr = entity;
    }
    entityArr.forEach(function (entity) {
        var _a;
        if (!entity || !(0, exports.entityAvailable)(hass, entity)) {
            (0, utils_1.unavailableOrMisconfiguredError)(entity);
        }
        var stateObj = hass.states[entity];
        if (stateObj) {
            var units_1 = (_a = stateObj.attributes.unit_of_measurement) === null || _a === void 0 ? void 0 : _a.toUpperCase();
            var statisticsForEntity = statistics[entity];
            if (statisticsForEntity && statisticsForEntity.length != 0) {
                statisticsForEntity.map(function (entry) {
                    var value = toWattHours(units_1, (0, utils_1.coerceNumber)(entry.change));
                    if (result.has(entry.start)) {
                        result.set(entry.start, result.get(entry.start) + value);
                    }
                    else {
                        result.set(entry.start, value);
                    }
                });
                if (displayMode !== "history") {
                    var timestamp = Date.parse(stateObj.last_changed);
                    if (!result.has(timestamp.toString())) {
                        var start = void 0;
                        var end = void 0;
                        if (displayMode == "hybrid") {
                            if (!periodStart) {
                                return;
                            }
                            start = periodStart;
                            end = periodEnd !== null && periodEnd !== void 0 ? periodEnd : new Date();
                        }
                        else {
                            end = new Date();
                            start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                        }
                        if (timestamp >= start.getTime() && timestamp <= end.getTime()) {
                            var state = (0, utils_1.coerceNumber)(stateObj.state);
                            var delta = toWattHours(units_1, state - (0, utils_1.coerceNumber)(statisticsForEntity[statisticsForEntity.length - 1].state));
                            result.set(Number.MAX_VALUE.toString(), delta);
                        }
                    }
                }
            }
        }
    });
    return result;
}
exports.getEntityStatistics = getEntityStatistics;
function toWattHours(units, value) {
    if (units === null || units === void 0 ? void 0 : units.startsWith("KWH")) {
        return (0, custom_card_helpers_1.round)(value * 1000, 0);
    }
    if (units === null || units === void 0 ? void 0 : units.startsWith("MWH")) {
        return (0, custom_card_helpers_1.round)(value * 1000000, 0);
    }
    return value;
}
//# sourceMappingURL=index.js.map