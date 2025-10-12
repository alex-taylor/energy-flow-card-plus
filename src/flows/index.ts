import { HomeAssistant } from "custom-card-helpers";
import { Statistics, StatisticValue } from "../energy";
import type { BatteryEntity } from "../entities/battery-entity";
import type { GridEntity } from "../entities/grid-entity";
import type { SolarEntity } from "../entities/solar-entity";
import { getEntityStatistics, toWattHours } from "../entities";
import { coerceNumber } from "../utils";
import { HassEntity } from "home-assistant-js-websocket";

export interface Flows {
  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
};

export const getLiveDeltas = (hass: HomeAssistant, periodStart: Date, periodEnd: Date, statistics: Statistics, solar: SolarEntity, battery: BatteryEntity, grid: GridEntity): Flows => {
  const solarProductionDelta: number = getDelta(hass, periodStart, periodEnd, statistics, solar.entity);
  const batteryConsumptionDelta: number = getDelta(hass, periodStart, periodEnd, statistics, battery.entity.consumption);
  const batteryProductionDelta: number = getDelta(hass, periodStart, periodEnd, statistics, battery.entity.production);
  const gridConsumptionDelta: number = getDelta(hass, periodStart, periodEnd, statistics, grid.entity.consumption);
  const gridProductionDelta: number = getDelta(hass, periodStart, periodEnd, statistics, grid.entity.production);
  return calculateFlows(solarProductionDelta, batteryConsumptionDelta, batteryProductionDelta, gridConsumptionDelta, gridProductionDelta);
};

const getDelta = (hass: HomeAssistant, periodStart: Date, periodEnd: Date, statistics: Statistics, entity: string): number => {
  const stateObj: HassEntity = hass.states[entity];

  if (!stateObj) {
    return 0;
  }

  const timestamp: number = Date.parse(stateObj.last_changed);

  if (timestamp >= periodStart.getTime() && timestamp <= periodEnd.getTime()) {
    const entityStats: StatisticValue[] = statistics[entity];
    const state: number = coerceNumber(stateObj.state);

    if (!entityStats || entityStats.length == 0) {
      return state;
    }

    const units = stateObj.attributes.unit_of_measurement?.toUpperCase();
    return toWattHours(units, state - (entityStats[entityStats.length - 1].state ?? 0));
  }

  return 0;
};

export const calculateStatisticsFlows = (hass: HomeAssistant, statistics: Statistics | undefined, solar: SolarEntity, battery: BatteryEntity, grid: GridEntity): void => {
  if (!statistics) {
    return;
  }

  const combinedStats: Map<number, Map<string, number>> = new Map();

  if (grid.isPresent) {
    addFlowStats(hass, statistics, combinedStats, grid.entity.consumption);

    if (grid.hasReturnToGrid) {
      addFlowStats(hass, statistics, combinedStats, grid.entity.production);
    }
  }

  if (battery.isPresent) {
    addFlowStats(hass, statistics, combinedStats, battery.entity.consumption);
    addFlowStats(hass, statistics, combinedStats, battery.entity.production);
  }

  if (solar.isPresent) {
    addFlowStats(hass, statistics, combinedStats, solar.entity);
  }

  let solarToHome: number = 0;
  let gridToHome: number = 0;
  let gridToBattery: number = 0;
  let batteryToGrid: number = 0;
  let batteryToHome: number = 0;
  let solarToBattery: number = 0;
  let solarToGrid: number = 0;
  let fromSolar: number = 0;
  let fromGrid: number = 0;
  let toGrid: number = 0;
  let toBattery: number = 0;
  let fromBattery: number = 0;

  combinedStats.forEach((entry, timestamp) => {
    const fs: number = entry.get(solar.entity) ?? 0;
    const fb: number = entry.get(battery.entity.consumption) ?? 0;
    const tb: number = entry.get(battery.entity.production) ?? 0;
    const fg: number = entry.get(grid.entity.consumption) ?? 0;
    const tg: number = entry.get(grid.entity.production) ?? 0;
    const results: Flows = calculateFlows(fs, fb, tb, fg, tg);

    solarToHome += results.solarToHome;
    gridToHome += results.gridToHome;
    gridToBattery += results.gridToBattery;
    batteryToGrid += results.batteryToGrid;
    batteryToHome += results.batteryToHome;
    solarToBattery += results.solarToBattery;
    solarToGrid += results.solarToGrid;
    fromSolar += fs;
    fromGrid += fg;
    toGrid += tg;
    fromBattery += fb;
    toBattery += tb;
  });

  if (grid.isPresent) {
    if (grid.powerOutage.isOutage) {
      grid.state.toHome = 0;
      grid.state.toBattery = 0;
      grid.state.fromGrid = 0;
      grid.state.toGrid = 0;
    } else {
      grid.state.toHome = clampStateValue(gridToHome, grid.displayZeroTolerance);
      grid.state.toBattery = clampStateValue(gridToBattery, grid.displayZeroTolerance);
      grid.state.fromGrid = clampStateValue(fromGrid, grid.displayZeroTolerance);

      if (grid.hasReturnToGrid) {
        grid.state.toGrid = clampStateValue(toGrid, grid.displayZeroTolerance);
      } else {
        grid.state.toGrid = 0;
      }
    }
  }

  if (battery.isPresent) {
    battery.state.toGrid = clampStateValue(batteryToGrid, battery.displayZeroTolerance);
    battery.state.toHome = clampStateValue(batteryToHome, battery.displayZeroTolerance);
    battery.state.fromBattery = clampStateValue(fromBattery, battery.displayZeroTolerance);
    battery.state.toBattery = clampStateValue(toBattery, battery.displayZeroTolerance);
  }

  if (solar.isPresent) {
    solar.state.toHome = clampStateValue(solarToHome, solar.displayZeroTolerance);
    solar.state.toBattery = clampStateValue(solarToBattery, solar.displayZeroTolerance);
    solar.state.toGrid = clampStateValue(solarToGrid, solar.displayZeroTolerance);
    solar.state.total = clampStateValue(fromSolar, solar.displayZeroTolerance);
  }
};

const calculateFlows = (fromSolar: number, fromBattery: number, toBattery: number, fromGrid: number, toGrid: number): Flows => {
  const energyIn: number = fromGrid + fromSolar + fromBattery;
  const energyOut: number = toGrid + toBattery;
  let remaining: number = Math.max(0, energyIn - energyOut);
  let solarToHome: number;
  let gridToHome: number;
  let gridToBattery: number;
  let batteryToGrid: number;
  let batteryToHome: number;
  let solarToBattery: number;
  let solarToGrid: number;

  const excess: number = Math.max(0, Math.min(toBattery, fromGrid - remaining));
  gridToBattery = excess;
  toBattery -= excess;
  fromGrid -= excess;

  solarToBattery = Math.min(fromSolar, toBattery);
  toBattery -= solarToBattery;
  fromSolar -= solarToBattery;

  solarToGrid = Math.min(fromSolar, toGrid);
  toGrid -= solarToGrid;
  fromSolar -= solarToGrid;

  batteryToGrid = Math.min(fromBattery, toGrid);
  fromBattery -= batteryToGrid;

  const gridToBattery2: number = Math.min(fromGrid, toBattery);
  gridToBattery += gridToBattery2;
  fromGrid -= gridToBattery2;

  solarToHome = Math.min(remaining, fromSolar);
  remaining -= solarToHome;

  batteryToHome = Math.min(fromBattery, remaining);
  remaining -= batteryToHome;

  gridToHome = Math.min(remaining, fromGrid);

  return {
    solarToHome: solarToHome,
    solarToBattery: solarToBattery,
    solarToGrid: solarToGrid,
    gridToHome: gridToHome,
    gridToBattery: gridToBattery,
    batteryToHome: batteryToHome,
    batteryToGrid: batteryToGrid
  };
}

const addFlowStats = (hass: HomeAssistant, statistics: Statistics, combinedStats: Map<number, Map<string, number>>, entity: string): void => {
  const entityStats: Map<number, number> = getEntityStatistics(hass, statistics, entity);

  entityStats.forEach((value, timestamp) => {
    let entry: Map<string, number> | undefined = combinedStats.get(timestamp);

    if (!entry) {
      entry = new Map();
    }

    entry.set(entity, value);
    combinedStats.set(timestamp, entry);
  });
};

const clampStateValue = (value: number, tolerance: number | undefined): number => {
  if (tolerance !== undefined && tolerance >= value) {
    return 0;
  }

  return value;
};

