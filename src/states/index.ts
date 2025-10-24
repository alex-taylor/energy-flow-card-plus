import { HomeAssistant, round } from "custom-card-helpers";
import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { clampStateValue, coerceNumber, isNumberValue, unavailableOrMisconfiguredError } from "@/utils";
import { EnergyCollection, EnergyData, Statistics, StatisticValue } from "@/hass";
import { AppearanceOptions, EditorPages, EnergyFlowCardExtConfig, EntitiesOptions, EntityConfig, EntityOptions, FlowsOptions, GlobalOptions } from "@/config";
import { GridState } from "./grid";
import { BatteryState } from "./battery";
import { GasState } from "./gas";
import { HomeState } from "./home";
import { LowCarbonState } from "./low-carbon";
import { SolarState } from "./solar";
import { DeviceState } from "./device";
import { addDays, addHours, differenceInDays, getHours, startOfDay } from "date-fns";
import { DisplayMode, EntityMode } from "@/enums";
import { logDebug } from "@/logging";
import { getEnergyDataCollection } from "@/energy";
import { ENERGY_DATA_TIMEOUT } from "@/const";

export interface Flows {
  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
};

const entityAvailable = (hass: HomeAssistant, entityId: string): boolean => isNumberValue(hass.states[entityId]?.state);

//export const getEntityStateObj = (hass: HomeAssistant, entity: string | undefined): HassEntity | undefined => {
//  if (!entity || !entityAvailable(hass, entity)) {
//    unavailableOrMisconfiguredError(entity);
//    return undefined;
//  }

//  return hass.states[entity];
//};

//export const getEntityState = (hass: HomeAssistant, entities: EntityConfig | undefined): number => {
//  if (!entities?.entity_ids?.length) {
//    return 0;
//  }

//  // TODO: support multiple entities
//  const entity: string = entities.entity_ids[0];
//  return coerceNumber(getEntityStateObj(hass, entity)?.state || 0);
//};

export const getEntityStateWattHours = (hass: HomeAssistant, statistics: Statistics | undefined, entities: EntityConfig | undefined): number => {
  if (!statistics || !entities?.entity_ids?.length) {
    return 0;
  }

  const entityStatistics = getEntityStatistics(hass, statistics, entities);
  let sum = 0;

  entityStatistics.forEach((value, key) => {
    sum += value;
  });

  return sum;
};

const getEntityStatistics = (hass: HomeAssistant, statistics: Statistics, entities: EntityConfig | undefined): Map<number, number> => {
  if (!entities?.entity_ids?.length) {
    return new Map();
  }

  const result: Map<number, number> = new Map();

  entities.entity_ids.forEach((entity) => {
    if (!entity || !entityAvailable(hass, entity)) {
      unavailableOrMisconfiguredError(entity);
    }

    const stateObj: HassEntity = hass.states[entity];

    if (stateObj) {
      const units = stateObj.attributes.unit_of_measurement;
      const statisticsForEntity: StatisticValue[] = statistics[entity];

      if (statisticsForEntity && statisticsForEntity.length != 0) {
        statisticsForEntity.map((entry) => {
          const value = toWattHours(units, coerceNumber(entry.change));

          if (result.has(entry.start)) {
            result.set(entry.start, result.get(entry.start)! + value);
          } else {
            result.set(entry.start, value);
          }
        });
      }
    }
  });

  return result;
};

export const toWattHours = (units: string | undefined, value: number): number => {
  if (units?.toUpperCase().startsWith("KWH")) {
    return value * 1000;
  }

  if (units?.toUpperCase().startsWith("MWH")) {
    return value * 1000000;
  }

  return value;
};

export class EntityStates {
  public hass: HomeAssistant;
  public battery: BatteryState;
  public gas: GasState;
  public grid: GridState;
  public home: HomeState;
  public lowCarbon: LowCarbonState;
  public solar: SolarState;
  public devices: DeviceState[];
  public primaryStatistics?: Statistics;
  public secondaryStatistics?: Statistics;
  public energyData;

  private _primaryEntityIds: string[] = [];
  private _secondaryEntityIds: string[] = [];
  private _entities: HassEntities = {};
  private _entityModes: Map<string, EntityMode> = new Map();
  private _error?: Error;

  public constructor(hass: HomeAssistant, config: EnergyFlowCardExtConfig) {
    this.hass = hass;
    this.battery = new BatteryState(config?.[EditorPages.Battery]);
    this.gas = new GasState(config?.[EditorPages.Gas]);
    this.grid = new GridState(config?.[EditorPages.Grid]);
    this.home = new HomeState(config?.[EditorPages.Home]);
    this.lowCarbon = new LowCarbonState(config?.[EditorPages.Low_Carbon]);
    this.solar = new SolarState(config?.[EditorPages.Solar]);
    this.devices = config?.[EditorPages.Devices]?.flatMap(device => new DeviceState(device)) || [];

    this._populateEntityArrays(config);
    this._inferEntityModes();
    this._subscribe(config);
  }

  public getLiveDeltas(periodStart: Date, periodEnd: Date): Flows {
    const solarProductionDelta: number = this._getDelta(periodStart, periodEnd, this.primaryStatistics, this.solar.config?.[EntitiesOptions.Entities]);
    const batteryImportDelta: number = this._getDelta(periodStart, periodEnd, this.primaryStatistics, this.battery.config?.[EntitiesOptions.Import_Entities]);
    const batteryExportDelta: number = this._getDelta(periodStart, periodEnd, this.primaryStatistics, this.battery.config?.[EntitiesOptions.Export_Entities]);
    const gridImportDelta: number = this._getDelta(periodStart, periodEnd, this.primaryStatistics, this.grid.config?.[EntitiesOptions.Import_Entities]);
    const gridExportDelta: number = this._getDelta(periodStart, periodEnd, this.primaryStatistics, this.grid.config?.[EntitiesOptions.Export_Entities]);
    // TODO: support all entities, replace the return-type with a new object
    return this._calculateFlows(solarProductionDelta, batteryImportDelta, batteryExportDelta, gridImportDelta, gridExportDelta);
  }

  private _subscribe(config: EnergyFlowCardExtConfig) {
    const start: number = Date.now();

    const getEnergyDataCollectionPoll = (
      resolve: (value: EnergyCollection | PromiseLike<EnergyCollection>) => void,
      reject: (reason?: any) => void
    ) => {
      const energyCollection = getEnergyDataCollection(this.hass);

      if (energyCollection) {
        resolve(energyCollection);
      } else if (Date.now() - start > ENERGY_DATA_TIMEOUT) {
        console.debug(getEnergyDataCollection(this.hass));
        reject(new Error("No energy data received."));
      } else {
        setTimeout(() => getEnergyDataCollectionPoll(resolve, reject), 100);
      }
    };

    const energyPromise = new Promise<EnergyCollection>(getEnergyDataCollectionPoll);

    setTimeout(
      () => {
        if (!this._error && !this.primaryStatistics && !this.secondaryStatistics) {
          this._error = new Error("No energy data received.");
        }
      },
      ENERGY_DATA_TIMEOUT * 2);

    energyPromise.catch((err) => this._error = err);

    energyPromise.then(async (collection: EnergyCollection) => {
      return collection.subscribe(async (data: EnergyData) => {
        this.energyData = data;

        let periodStart: Date;
        let periodEnd: Date;

        if (config?.[GlobalOptions.Display_Mode] === DisplayMode.Today) {
          periodEnd = new Date();
          periodStart = startOfDay(periodEnd);
        } else {
          periodStart = data.start;
          periodEnd = data.end ?? new Date();
        }

        const period = config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Use_Hourly_Stats] || differenceInDays(periodEnd, periodStart) <= 2 ? 'hour' : 'day';
        await this._loadStatistics(periodStart, periodEnd, period);
      });
    });
  }

  private async _loadStatistics(periodStart: Date, periodEnd: Date, period: '5minute' | 'hour' | 'day' | 'week' | 'month') {
    const [previousPrimaryData, primaryData, previousSecondaryData, secondaryData]: Statistics[] = await Promise.all([
      this._fetchStatistics(addHours(periodStart, -1), periodStart, this._primaryEntityIds, 'hour'),
      this._fetchStatistics(periodStart, periodEnd, this._primaryEntityIds, period),
      this._fetchStatistics(addHours(periodStart, -1), periodStart, this._secondaryEntityIds, 'day'),
      this._fetchStatistics(periodStart, periodEnd, this._secondaryEntityIds, 'day')
    ]);

    console.log("Received stats @ " + new Date());
    this._validateStatistics(primaryData, previousPrimaryData, periodStart, periodEnd);
    this._validateStatistics(secondaryData, previousSecondaryData, periodStart, periodEnd);
    this.primaryStatistics = primaryData;
    this.secondaryStatistics = secondaryData;
    this._calculateStatisticsFlows();
  }

  private _getDelta(periodStart: Date, periodEnd: Date, statistics: Statistics | undefined, entities: EntityConfig | undefined): number {
    if (!statistics || !entities?.[EntityOptions.Entity_Ids]?.length) {
      return 0;
    }

    // TODO: support all entities
    const entity: string = entities[EntityOptions.Entity_Ids][0];
    const stateObj: HassEntity = this._entities[entity];

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
  }

  private async _inferEntityModes(): Promise<void> {
    const data: Statistics = await this._fetchStatistics(addDays(startOfDay(new Date()), -1), null, [...this._primaryEntityIds, ...this._secondaryEntityIds], 'day');

    for (const entity in data) {
      if (data[entity].length !== 0) {
        const firstStat: StatisticValue = data[entity][0];
        let mode;

        if (this._isMisconfiguredResettingSensor(firstStat)) {
          mode = EntityMode.Misconfigured_Resetting;
        } else if (this._isTotalisingSensor(firstStat)) {
          mode = EntityMode.Totalising;
        } else {
          mode = EntityMode.Resetting;
        }

        logDebug(entity + " is a " + mode + " sensor (change=" + firstStat.change + ", state=" + firstStat.state + ")");
        this._entityModes.set(entity, mode);
      } else {
        this._entityModes.set(entity, EntityMode.Totalising);
      }
    }
  };

  private _isMisconfiguredResettingSensor(stat: StatisticValue): boolean {
    const change: number = round(stat.change || 0, 6);
    let state: number = round(stat.state || 0, 6);
    return change > state || change < 0;
  }

  private _isTotalisingSensor(stat: StatisticValue): boolean {
    const change: number = round(stat.change || 0, 6);
    let state: number = round(stat.state || 0, 6);
    return change >= 0 && change < state;
  }

  private _calculateStatisticsFlows(): void {
    if (!this.primaryStatistics) {
      return;
    }

    const combinedStats: Map<number, Map<string, number>> = new Map();

    if (this.grid.isPresent) {
      this._addFlowStats(this.primaryStatistics, combinedStats, this.grid.config?.[EntitiesOptions.Import_Entities]);
      this._addFlowStats(this.primaryStatistics, combinedStats, this.grid.config?.[EntitiesOptions.Export_Entities]);
    }

    if (this.battery.isPresent) {
      this._addFlowStats(this.primaryStatistics, combinedStats, this.battery.config?.[EntitiesOptions.Import_Entities]);
      this._addFlowStats(this.primaryStatistics, combinedStats, this.battery.config?.[EntitiesOptions.Export_Entities]);
    }

    if (this.solar.isPresent) {
      this._addFlowStats(this.primaryStatistics, combinedStats, this.solar.config?.[EntitiesOptions.Entities]);
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
      const fs: number = this._getStates(entry, this.solar.config?.[EntitiesOptions.Entities]);
      const fb: number = this._getStates(entry, this.battery.config?.[EntitiesOptions.Import_Entities]);
      const tb: number = this._getStates(entry, this.battery.config?.[EntitiesOptions.Export_Entities]);
      const fg: number = this._getStates(entry, this.grid.config?.[EntitiesOptions.Import_Entities]);
      const tg: number = this._getStates(entry, this.grid.config?.[EntitiesOptions.Export_Entities]);
      const results: Flows = this._calculateFlows(fs, fb, tb, fg, tg);

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

    if (this.grid.isPresent) {
      if (this.grid.powerOutage.isOutage) {
        this.grid.state.toHome = 0;
        this.grid.state.toBattery = 0;
        this.grid.state.fromGrid = 0;
        this.grid.state.toGrid = 0;
      } else {
        const threshold: number = this.grid.config?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Zero_Threshold] || 0;
        this.grid.state.toHome = clampStateValue(gridToHome, threshold);
        this.grid.state.toBattery = clampStateValue(gridToBattery, threshold);
        this.grid.state.fromGrid = clampStateValue(fromGrid, threshold);
        this.grid.state.toGrid = clampStateValue(toGrid, this.grid.config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Zero_Threshold]);
      }
    }

    if (this.battery.isPresent) {
      const threshold: number = this.battery.config?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Zero_Threshold] || 0;
      this.battery.state.toGrid = clampStateValue(batteryToGrid, threshold);
      this.battery.state.toHome = clampStateValue(batteryToHome, threshold);
      this.battery.state.fromBattery = clampStateValue(fromBattery, threshold);
      this.battery.state.toBattery = clampStateValue(toBattery, this.battery.config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Zero_Threshold]);
    }

    if (this.solar.isPresent) {
      const threshold: number = this.solar.config?.[EntitiesOptions.Entities]?.[EntityOptions.Zero_Threshold] || 0;
      this.solar.state.toHome = clampStateValue(solarToHome, threshold);
      this.solar.state.toBattery = clampStateValue(solarToBattery, threshold);
      this.solar.state.toGrid = clampStateValue(solarToGrid, threshold);
      this.solar.state.total = clampStateValue(fromSolar, threshold);
    }
  }

  private _addFlowStats(statistics: Statistics, combinedStats: Map<number, Map<string, number>>, entities: EntityConfig | undefined): void {
    if (!entities?.[EntityOptions.Entity_Ids]?.length) {
      return;
    }

    // TODO: support multiple entities
    const entityStats: Map<number, number> = getEntityStatistics(this.hass, statistics, entities);
    const entity: string = entities?.[EntityOptions.Entity_Ids][0];

    entityStats.forEach((value, timestamp) => {
      let entry: Map<string, number> | undefined = combinedStats.get(timestamp);

      if (!entry) {
        entry = new Map();
      }

      entry.set(entity, value);
      combinedStats.set(timestamp, entry);
    });
  }

  private _getStates(entry: Map<string, number>, entities: EntityConfig | undefined): number {
    if (!entities?.[EntityOptions.Entity_Ids]?.length) {
      return 0;
    }

    // TODO: support multiple entries
    const entity: string = entities[EntityOptions.Entity_Ids][0];
    return entry.get(entity)!;
  }

  private _calculateFlows(fromSolar: number, fromBattery: number, toBattery: number, fromGrid: number, toGrid: number): Flows {
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

  private _populateEntityArrays(config: EnergyFlowCardExtConfig): void {
    const hassEntities: HassEntities = this.hass["entities"];

    this._primaryEntityIds = [];
    this._secondaryEntityIds = [];

    for (const pageId in EditorPages) {
      const page: any = config[EditorPages[pageId]];

      if (EditorPages[pageId] === EditorPages.Devices) {
        page.forEach((device, index) => {
          if (device?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length) {
            this._primaryEntityIds.push(...device?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]);
            page?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids].forEach((id, index) => { this._entities[id] = hassEntities[id]; });
          }
        });
      } else {
        if (page?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._primaryEntityIds.push(...page?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]);
          page?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids].forEach((id, index) => { this._entities[id] = hassEntities[id]; });
        }

        if (page?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._primaryEntityIds.push(...page?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]);
          page?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids].forEach((id, index) => { this._entities[id] = hassEntities[id]; });
        }

        if (page?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._primaryEntityIds.push(...page?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]);
          page?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids].forEach((id, index) => { this._entities[id] = hassEntities[id]; });
        }

        if (page?.[EntitiesOptions.Secondary_Info]?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._secondaryEntityIds.push(...page?.[EntitiesOptions.Secondary_Info]?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]);
          page?.[EntitiesOptions.Secondary_Info]?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids].forEach((id, index) => { this._entities[id] = hassEntities[id]; });
        }
      }
    }
  }

  private _validateStatistics(currentData: Statistics, previousData: Statistics, periodStart: Date, periodEnd: Date): void {
    this._primaryEntityIds.forEach(entity => {
      //delete data[entity];
      let statsForEntity: StatisticValue[] = currentData[entity];
      let idx: number = 0;

      if (!statsForEntity || statsForEntity.length == 0 || statsForEntity[0].start > periodStart.getTime()) {
        let dummyStat: StatisticValue;

        if (previousData && previousData[entity]?.length) {
          // This entry is the final stat prior to the period we are interested in.  It is only needed for the case where we need to calculate the
          // Live/Hybrid-mode state-delta at midnight on the current date (ie, before the first stat of the new day has been generated) so we do
          // not want to include its values in the stats calculations.
          const previousStat: StatisticValue = previousData[entity][0];

          dummyStat = {
            ...previousStat,
            change: 0,
            state: this._entityModes.get(entity) === EntityMode.Totalising ? previousStat.state : 0,
            mean: 100
          };
        } else {
          dummyStat = {
            change: 0,
            state: 0,
            sum: 0,
            start: periodStart.getTime(),
            end: periodEnd.getTime(),
            min: 0,
            mean: 100,
            max: 0,
            last_reset: null,
            statistic_id: entity
          };
        }

        if (statsForEntity) {
          statsForEntity.unshift(dummyStat);
        } else {
          statsForEntity = new Array(dummyStat);
          currentData[entity] = statsForEntity;
        }

        idx++;
      }

      if (statsForEntity.length > idx) {
        let lastState: number = 0;

        statsForEntity.forEach(stat => {
          if (getHours(stat.start) === 0) {
            if (this._entityModes.get(entity) === EntityMode.Misconfigured_Resetting) {
              // this is a 'resetting' sensor which has been misconfigured such that the first 'change' value following the reset is out of range
              stat.change = stat.state;
            }

            lastState = stat.state || 0;
          } else {
            // the 'change' values coming back from statistics are not always correct, so recalculate them from the state-diffs
            const state: number = stat.state || 0;
            stat.change = state - lastState;
            lastState = state;
          }
        });
      }
    });
  }

  private _fetchStatistics(startTime: Date, endTime?: Date | null, entityIds?: string[], period: '5minute' | 'hour' | 'day' | 'week' | 'month' = 'hour'): Promise<Statistics> {
    return this.hass.callWS<Statistics>({
      type: 'recorder/statistics_during_period',
      start_time: startTime.toISOString(),
      end_time: endTime?.toISOString(),
      statistic_ids: entityIds,
      period: period
    });
  }
}
