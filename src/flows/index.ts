import { HomeAssistant } from "custom-card-helpers";
import { Statistics } from "../energy";
import type { Flows } from "../types";
import type { BatteryEntity } from "../entities/battery-entity";
import type { GridEntity } from "../entities/grid-entity";
import type { SolarEntity } from "../entities/solar-entity";
import { getEntityStatistics } from "../entities";

export const calculateFlowValues = (hass: HomeAssistant, displayMode: string | undefined, periodStart: Date | undefined, periodEnd: Date | undefined, statistics: Statistics | undefined, solar: SolarEntity, battery: BatteryEntity, grid: GridEntity): void => {
  if (!statistics) {
    return;
  }

  const combinedStats: Map<string, Map<string, number>> = new Map();

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

  let solarToHome: number = 0;
  let gridToHome: number = 0;
  let gridToBattery: number = 0;
  let batteryToGrid: number = 0;
  let batteryToHome: number = 0;
  let solarToBattery: number = 0;
  let solarToGrid: number = 0;

  combinedStats.forEach((entry, timestamp) => {
    const results: Flows = calculateFlows(entry.get(solar.entity) ?? 0, entry.get(battery.entity.consumption) ?? 0, entry.get(battery.entity.production) ?? 0, entry.get(grid.entity.consumption) ?? 0, entry.get(grid.entity.production) ?? 0);
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
    } else {
      grid.state.fromGrid = clampStateValue(grid.state.toHome + grid.state.toBattery, grid.display_zero_tolerance);

      if (grid.hasReturnToGrid) {
        grid.state.toGrid = clampStateValue(solar.state.toGrid + battery.state.toGrid, grid.display_zero_tolerance);
      } else {
        grid.state.toGrid = 0;
      }
    }
  }

  if (battery.isPresent) {
    battery.state.toBattery = clampStateValue(solar.state.toBattery + grid.state.toBattery, battery.display_zero_tolerance ?? 0);
    battery.state.fromBattery = clampStateValue(battery.state.toHome + battery.state.toGrid, battery.display_zero_tolerance ?? 0);
  }

  if (solar.isPresent) {
    solar.state.total = Math.max(solar.state.toGrid + solar.state.toBattery + solar.state.toHome, solar.display_zero_tolerance ?? 0);
  }
};

const calculateFlows = (solarProduction: number, batteryConsumption: number, batteryProduction: number, gridConsumption: number, gridProduction: number): Flows => {
  let solarToHome: number;
  let gridToHome: number;
  let gridToBattery: number;
  let batteryToGrid: number;
  let batteryToHome: number;
  let solarToBattery: number;
  let solarToGrid: number;
  let total: number = gridConsumption + solarProduction + batteryConsumption - gridProduction - batteryProduction;
  let remaining: number = Math.max(total, 0);

  const excess: number = Math.max(0, Math.min(batteryProduction, gridConsumption - remaining));
  gridToBattery = excess;
  batteryProduction -= excess;
  gridConsumption -= excess;

  solarToBattery = Math.min(solarProduction, batteryProduction);
  batteryProduction -= solarToBattery;
  solarProduction -= solarToBattery;

  solarToGrid = Math.min(solarProduction, gridProduction);
  gridProduction -= solarToGrid;
  solarProduction -= solarToGrid;

  batteryToGrid = Math.min(batteryConsumption, gridProduction);
  batteryConsumption -= batteryToGrid;

  const gridToBattery2: number = Math.min(gridConsumption, batteryProduction);
  gridToBattery += gridToBattery2;
  gridConsumption -= gridToBattery2;

  solarToHome = Math.min(remaining, solarProduction);
  remaining -= solarToHome;

  batteryToHome = Math.min(batteryConsumption, remaining);
  remaining -= batteryToHome;

  gridToHome = Math.min(remaining, gridConsumption);

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

const addFlowStats = (hass: HomeAssistant, displayMode: string | undefined, periodStart: Date | undefined, periodEnd: Date | undefined, statistics: Statistics, combinedStats: Map<string, Map<string, number>>, entity: string): void => {
  const entityStats: Map<string, number> = getEntityStatistics(hass, displayMode, periodStart, periodEnd, statistics, entity);

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

