"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFlowValues = void 0;
var entities_1 = require("../entities");
var calculateFlowValues = function (hass, displayMode, periodStart, periodEnd, statistics, solar, battery, grid) {
    var _a, _b, _c;
    if (!statistics) {
        return;
    }
    var combinedStats = new Map();
    if (grid.isPresent) {
        addFlowStats(hass, displayMode, periodStart, periodEnd, statistics, combinedStats, grid.entity.consumption);
        if (grid.hasReturnToGrid) {
            addFlowStats(hass, displayMode, periodStart, periodEnd, statistics, combinedStats, grid.entity.production);
        }
    }
    if (battery.isPresent) {
        addFlowStats(hass, displayMode, periodStart, periodEnd, statistics, combinedStats, battery.entity.consumption);
        addFlowStats(hass, displayMode, periodStart, periodEnd, statistics, combinedStats, battery.entity.production);
    }
    if (solar.isPresent) {
        addFlowStats(hass, displayMode, periodStart, periodEnd, statistics, combinedStats, solar.entity);
    }
    var solarToHome = 0;
    var gridToHome = 0;
    var gridToBattery = 0;
    var batteryToGrid = 0;
    var batteryToHome = 0;
    var solarToBattery = 0;
    var solarToGrid = 0;
    combinedStats.forEach(function (entry, timestamp) {
        var _a, _b, _c, _d, _e;
        var results = calculateFlows(solar.isPresent, battery.isPresent, (_a = entry.get(solar.entity)) !== null && _a !== void 0 ? _a : 0, (_b = entry.get(battery.entity.consumption)) !== null && _b !== void 0 ? _b : 0, (_c = entry.get(battery.entity.production)) !== null && _c !== void 0 ? _c : 0, (_d = entry.get(grid.entity.consumption)) !== null && _d !== void 0 ? _d : 0, (_e = entry.get(grid.entity.production)) !== null && _e !== void 0 ? _e : 0);
        solarToHome += results.solarToHome;
        gridToHome += results.gridToHome;
        gridToBattery += results.gridToBattery;
        batteryToGrid += results.batteryToGrid;
        batteryToHome += results.batteryToHome;
        solarToBattery += results.solarToBattery;
        solarToGrid += results.solarToGrid;
    });
    solar.state.toHome = solarToHome;
    grid.state.toHome = gridToHome;
    grid.state.toBattery = gridToBattery;
    battery.state.toGrid = batteryToGrid;
    battery.state.toHome = batteryToHome;
    solar.state.toBattery = solarToBattery;
    solar.state.toGrid = solarToGrid;
    if (grid.isPresent) {
        if (grid.powerOutage.isOutage) {
            grid.state.fromGrid = 0;
            grid.state.toGrid = 0;
        }
        else {
            grid.state.fromGrid = clampStateValue(grid.state.toHome + grid.state.toBattery, grid.display_zero_tolerance);
            if (grid.hasReturnToGrid) {
                grid.state.toGrid = clampStateValue(solar.state.toGrid + battery.state.toGrid, grid.display_zero_tolerance);
            }
            else {
                grid.state.toGrid = 0;
            }
        }
    }
    if (battery.isPresent) {
        battery.state.toBattery = clampStateValue(solar.state.toBattery + grid.state.toBattery, (_a = battery.display_zero_tolerance) !== null && _a !== void 0 ? _a : 0);
        battery.state.fromBattery = clampStateValue(battery.state.toHome + battery.state.toGrid, (_b = battery.display_zero_tolerance) !== null && _b !== void 0 ? _b : 0);
    }
    if (solar.isPresent) {
        solar.state.total = Math.max(solar.state.toGrid + solar.state.toBattery + solar.state.toHome, (_c = solar.display_zero_tolerance) !== null && _c !== void 0 ? _c : 0);
    }
};
exports.calculateFlowValues = calculateFlowValues;
var calculateFlows = function (solarIsPresent, batteryIsPresent, solarProduction, batteryConsumption, batteryProduction, gridConsumption, gridProduction) {
    var solarToHome = 0;
    var gridToHome = 0;
    var gridToBattery = 0;
    var batteryToGrid = 0;
    var batteryToHome = 0;
    var solarToBattery = 0;
    var solarToGrid = 0;
    if (solarIsPresent) {
        solarToHome = solarProduction - (gridProduction !== null && gridProduction !== void 0 ? gridProduction : 0) - (batteryProduction !== null && batteryProduction !== void 0 ? batteryProduction : 0);
    }
    // Update State Values of Battery to Grid and Grid to Battery
    if (solarToHome < 0) {
        // What we returned to the grid and what went in to the battery is more
        // than produced, so we have used grid energy to fill the battery or
        // returned battery energy to the grid
        if (batteryIsPresent) {
            gridToBattery = Math.abs(solarToHome);
            if (gridToBattery > gridConsumption) {
                batteryToGrid = Math.min(gridToBattery - gridConsumption, 0);
                gridToBattery = gridConsumption;
            }
        }
        solarToHome = 0;
    }
    // Update State Values of Solar to Battery and Battery to Grid
    if (solarIsPresent && batteryIsPresent) {
        if (!batteryToGrid) {
            batteryToGrid = Math.max(0, (gridProduction || 0) - (solarProduction || 0) - (batteryProduction || 0) - (gridToBattery || 0));
        }
        solarToBattery = batteryProduction - (gridToBattery || 0);
    }
    else if (!solarIsPresent && batteryIsPresent) {
        // In the absence of solar production, the battery is the only energy producer
        // besides the grid, so whatever was given to the grid must come from
        // the battery
        batteryToGrid = gridProduction !== null && gridProduction !== void 0 ? gridProduction : 0;
        // In the absence of solar production, what was consumed by the battery
        // must come from the grid, since there are no other energy producers.
        gridToBattery = batteryProduction !== null && batteryProduction !== void 0 ? batteryProduction : 0;
    }
    // Update State Values of Solar to Grid
    if (solarIsPresent && gridProduction) {
        solarToGrid = gridProduction - (batteryToGrid !== null && batteryToGrid !== void 0 ? batteryToGrid : 0);
    }
    // Update State Values of Battery to Home
    if (batteryIsPresent) {
        batteryToHome = (batteryConsumption !== null && batteryConsumption !== void 0 ? batteryConsumption : 0) - (batteryToGrid !== null && batteryToGrid !== void 0 ? batteryToGrid : 0);
    }
    gridToHome = (gridConsumption !== null && gridConsumption !== void 0 ? gridConsumption : 0) - gridToBattery;
    return {
        solarToHome: solarToHome,
        solarToBattery: solarToBattery,
        solarToGrid: solarToGrid,
        gridToHome: gridToHome,
        gridToBattery: gridToBattery,
        batteryToHome: batteryToHome,
        batteryToGrid: batteryToGrid
    };
};
var addFlowStats = function (hass, displayMode, periodStart, periodEnd, statistics, combinedStats, entity) {
    var entityStats = (0, entities_1.getEntityStatistics)(hass, displayMode, periodStart, periodEnd, statistics, entity);
    entityStats.forEach(function (value, timestamp) {
        var entry = combinedStats.get(timestamp);
        if (!entry) {
            entry = new Map();
        }
        entry.set(entity, value);
        combinedStats.set(timestamp, entry);
    });
};
var clampStateValue = function (value, tolerance) {
    if (tolerance !== undefined && tolerance >= value) {
        return 0;
    }
    return value;
};
//# sourceMappingURL=index.js.map