import { HomeAssistant } from "custom-card-helpers";
import { Statistics, StatisticValue } from "@/hass";
import type { BatteryState } from "../states/battery";
import type { GridState } from "../states/grid";
import type { SolarState } from "../states/solar";
import { getEntityStatistics, toWattHours } from "../states";
import { clampStateValue, coerceNumber } from "../utils";
import { HassEntity } from "home-assistant-js-websocket";
import { EntityConfig, EntityOptions } from "../config";

export interface Flows {
  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
};

export const getLiveDeltas = (hass: HomeAssistant, periodStart: Date, periodEnd: Date, statistics: Statistics, solar: SolarState, battery: BatteryState, grid: GridState): Flows => {
  const solarProductionDelta: number = getDelta(hass, periodStart, periodEnd, statistics, solar.config?.entities);
  const batteryImportDelta: number = getDelta(hass, periodStart, periodEnd, statistics, battery.config?.import_entities);
  const batteryExportDelta: number = getDelta(hass, periodStart, periodEnd, statistics, battery.config?.export_entities);
  const gridImportDelta: number = getDelta(hass, periodStart, periodEnd, statistics, grid.config?.import_entities);
  const gridExportDelta: number = getDelta(hass, periodStart, periodEnd, statistics, grid.config?.export_entities);
  return calculateFlows(solarProductionDelta, batteryImportDelta, batteryExportDelta, gridImportDelta, gridExportDelta);
};

const getDelta = (hass: HomeAssistant, periodStart: Date, periodEnd: Date, statistics: Statistics, entities: EntityConfig | undefined): number => {
  if (!entities?.entity_ids?.length) {
    return 0;
  }

  // TODO: support all entities
  const entity: string = entities[EntityOptions.Entity_Ids][0];
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

    const units = stateObj.attributes.unit_of_measurement;
    return toWattHours(units, state - (entityStats[entityStats.length - 1].state ?? 0));
  }

  return 0;
};

export const calculateStatisticsFlows = (hass: HomeAssistant, statistics: Statistics | undefined, solar: SolarState, battery: BatteryState, grid: GridState): void => {
  if (!statistics) {
    return;
  }

  const combinedStats: Map<number, Map<string, number>> = new Map();

  if (grid.isPresent) {
    addFlowStats(hass, statistics, combinedStats, grid.config?.import_entities);
    addFlowStats(hass, statistics, combinedStats, grid.config?.export_entities);
  }

  if (battery.isPresent) {
    addFlowStats(hass, statistics, combinedStats, battery.config?.import_entities);
    addFlowStats(hass, statistics, combinedStats, battery.config?.export_entities);
  }

  if (solar.isPresent) {
    addFlowStats(hass, statistics, combinedStats, solar.config?.entities);
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
    const fs: number = getStates(entry, solar.config?.entities);
    const fb: number = getStates(entry, battery.config?.import_entities);
    const tb: number = getStates(entry, battery.config?.export_entities);
    const fg: number = getStates(entry, grid.config?.import_entities);
    const tg: number = getStates(entry, grid.config?.export_entities);
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
      const threshold: number = grid.config?.import_entities?.zero_threshold || 0;
      grid.state.toHome = clampStateValue(gridToHome, threshold);
      grid.state.toBattery = clampStateValue(gridToBattery, threshold);
      grid.state.fromGrid = clampStateValue(fromGrid, threshold);
      grid.state.toGrid = clampStateValue(toGrid, grid.config?.export_entities?.zero_threshold);
    }
  }

  if (battery.isPresent) {
    const threshold: number = battery.config?.import_entities?.zero_threshold || 0;
    battery.state.toGrid = clampStateValue(batteryToGrid, threshold);
    battery.state.toHome = clampStateValue(batteryToHome, threshold);
    battery.state.fromBattery = clampStateValue(fromBattery, threshold);
    battery.state.toBattery = clampStateValue(toBattery, battery.config?.export_entities?.zero_threshold);
  }

  if (solar.isPresent) {
    const threshold: number = solar.config?.entities?.zero_threshold || 0;
    solar.state.toHome = clampStateValue(solarToHome, threshold);
    solar.state.toBattery = clampStateValue(solarToBattery, threshold);
    solar.state.toGrid = clampStateValue(solarToGrid, threshold);
    solar.state.total = clampStateValue(fromSolar, threshold);
  }
};

const getStates = (entry: Map<string, number>, entities: EntityConfig | undefined): number => {
  if (!entities?.entity_ids?.length) {
    return 0;
  }

  // TODO: support multiple entries
  const entity: string = entities[EntityOptions.Entity_Ids][0];
  return entry.get(entity)!;
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

const addFlowStats = (hass: HomeAssistant, statistics: Statistics, combinedStats: Map<number, Map<string, number>>, entities: EntityConfig | undefined): void => {
  if (!entities?.entity_ids?.length) {
    return;
  }

  // TODO: support multiple entities
  const entityStats: Map<number, number> = getEntityStatistics(hass, statistics, entities);
  const entity: string = entities.entity_ids[0];

  entityStats.forEach((value, timestamp) => {
    let entry: Map<string, number> | undefined = combinedStats.get(timestamp);

    if (!entry) {
      entry = new Map();
    }

    entry.set(entity, value);
    combinedStats.set(timestamp, entry);
  });
};
