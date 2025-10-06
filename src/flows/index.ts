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
    const results: Flows = calculateFlows(solar.isPresent, battery.isPresent, entry.get(solar.entity) ?? 0, entry.get(battery.entity.consumption) ?? 0, entry.get(battery.entity.production) ?? 0, entry.get(grid.entity.consumption) ?? 0, entry.get(grid.entity.production) ?? 0);
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

const calculateFlows = (solarIsPresent: boolean, batteryIsPresent: boolean, solarProduction: number, batteryConsumption: number, batteryProduction: number, gridConsumption: number, gridProduction: number): Flows => {
  let solarToHome: number = 0
  let gridToHome: number = 0;
  let gridToBattery: number = 0;
  let batteryToGrid: number = 0;
  let batteryToHome: number = 0;
  let solarToBattery: number = 0;
  let solarToGrid: number = 0;

  if (solarIsPresent) {
    solarToHome = solarProduction - (gridProduction ?? 0) - (batteryProduction ?? 0);
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
  } else if (!solarIsPresent && batteryIsPresent) {
    // In the absence of solar production, the battery is the only energy producer
    // besides the grid, so whatever was given to the grid must come from
    // the battery
    batteryToGrid = gridProduction ?? 0;

    // In the absence of solar production, what was consumed by the battery
    // must come from the grid, since there are no other energy producers.
    gridToBattery = batteryProduction ?? 0;
  }

  // Update State Values of Solar to Grid
  if (solarIsPresent && gridProduction) {
    solarToGrid = gridProduction - (batteryToGrid ?? 0);
  }

  // Update State Values of Battery to Home
  if (batteryIsPresent) {
    batteryToHome = (batteryConsumption ?? 0) - (batteryToGrid ?? 0);
  }

  gridToHome = (gridConsumption ?? 0) - gridToBattery;

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

