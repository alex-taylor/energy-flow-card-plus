import { HomeAssistant, round } from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import { EnergyCollection, EnergyData, Statistics, StatisticValue } from "@/hass";
import { AppearanceOptions, EditorPages, EnergyFlowCardExtConfig, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions } from "@/config";
import { GridState } from "./grid";
import { BatteryState } from "./battery";
import { GasState } from "./gas";
import { HomeState } from "./home";
import { LowCarbonState } from "./low-carbon";
import { SolarState } from "./solar";
import { DeviceState } from "./device";
import { addDays, addHours, differenceInDays, endOfDay, getHours, startOfDay } from "date-fns";
import { DisplayMode, EntityMode } from "@/enums";
import { logDebug } from "@/logging";
import { getEnergyDataCollection } from "@/energy";
import { ENERGY_DATA_TIMEOUT } from "@/const";
import { ValueState } from "./state";
import { Flows, States } from ".";

export class EntityStates {
  public hass: HomeAssistant;

  public get isDatePickerPresent(): boolean {
    return this._energyData;
  }

  public battery: BatteryState;
  public gas: GasState;
  public grid: GridState;
  public home: HomeState;
  public lowCarbon: LowCarbonState;
  public solar: SolarState;
  public devices: DeviceState[];

  private _energyData;
  private _displayMode: DisplayMode;
  private _primaryEntityIds: string[] = [];
  private _secondaryEntityIds: string[] = [];
  private _primaryStatistics?: Statistics;
  private _secondaryStatistics?: Statistics;
  private _entityModes: Map<string, EntityMode> = new Map();
  private _error?: Error;
  private _co2data?: Record<string, number>;

  //================================================================================================================================================================================//

  public constructor(hass: HomeAssistant, config: EnergyFlowCardExtConfig) {
    this.hass = hass;
    this._displayMode = config?.[GlobalOptions.Display_Mode]!;

    // TODO: filter out incompatible entities - probably done in each State object, and then use these to build the arrays

    this.battery = new BatteryState(hass, config?.[EditorPages.Battery]);
    this.gas = new GasState(hass, config?.[EditorPages.Gas]);
    this.grid = new GridState(hass, config?.[EditorPages.Grid]);
    this.home = new HomeState(hass, config?.[EditorPages.Home]);
    this.lowCarbon = new LowCarbonState(hass, config?.[EditorPages.Low_Carbon]);
    this.solar = new SolarState(hass, config?.[EditorPages.Solar]);
    this.devices = config?.[EditorPages.Devices]?.flatMap(device => new DeviceState(hass, device)) || [];

    this._populateEntityArrays(config);
    this._inferEntityModes();
    this._subscribe(config);
  }

  //================================================================================================================================================================================//

  public getStates(): States {
    const states: States = {
      batteryImport: this.battery.state.import,
      batteryExport: this.battery.state.export,
      batterySecondary: this.battery.secondary.state,
      gasImport: this.gas.state,
      gasSecondary: this.gas.secondary.state,
      gridImport: this.grid.state.import,
      gridExport: this.grid.state.export,
      gridSecondary: this.grid.secondary.state,
      highCarbon: this.grid.state.highCarbon,
      home: 0,
      homeSecondary: this.home.secondary.state,
      lowCarbon: 0,
      lowCarbonPercentage: 0,
      lowCarbonSecondary: this.lowCarbon.secondary.state,
      solarImport: this.solar.state.import,
      solarSecondary: this.solar.secondary.state,
      // TODO
      devices: [],
      devicesSecondary: this.devices.map(device => device.secondary.state),
      flows: {
        batteryToGrid: this.grid.state.fromBattery,
        solarToGrid: this.grid.state.fromSolar,
        gridToBattery: this.battery.state.fromGrid,
        solarToBattery: this.battery.state.fromSolar,
        batteryToHome: this.home.state.fromBattery,
        gridToHome: this.home.state.fromGrid,
        solarToHome: this.home.state.fromSolar
      }
    };

    this._addStateDeltas(states);

    states.home = states.batteryImport + states.gridImport + states.solarImport - states.batteryExport - states.gridExport;
    states.lowCarbon = states.gridImport - states.highCarbon;
    states.lowCarbonPercentage = (states.lowCarbon / states.gridImport) * 100;

    // The net energy in the system is (imports-exports), but as the entities may not be updated in sync with each other it is possible that the flows to the home will
    // not add up to the same value.  When this happens, while we still want to return the net energy for display, we need to rescale the flows so that the animation and
    // circles will look sensible.
    const toHome: number = states.flows.batteryToHome + states.flows.gridToHome + states.flows.solarToHome;
    let scale: number = states.home / toHome;
    states.flows.batteryToHome *= scale;
    states.flows.gridToHome *= scale;
    states.flows.solarToHome *= scale;

    // and similar for the exports
    const toGrid: number = states.flows.batteryToGrid + states.flows.solarToGrid;
    scale = states.gridExport / toGrid;
    states.flows.batteryToGrid *= scale;
    states.flows.solarToGrid *= scale;

    const toBattery: number = states.flows.gridToBattery + states.flows.solarToBattery;
    scale = states.batteryExport / toBattery;
    states.flows.gridToBattery *= scale;
    states.flows.solarToBattery *= scale;

    return states;
  }

  //================================================================================================================================================================================//

  private _addStateDeltas(states: States): void {
    if (this._displayMode === DisplayMode.History) {
      return;
    }

    let periodStart: Date;
    let periodEnd: Date;

    if (this._displayMode === DisplayMode.Today) {
      periodStart = startOfDay(new Date());
      periodEnd = endOfDay(periodStart);
    } else {
      periodStart = this._energyData!.start;
      periodEnd = this._energyData!.end!;
    }

    const solarImportDelta: number = this._getStateDelta(periodStart, periodEnd, this._primaryStatistics, this.solar.mainEntities);
    const batteryImportDelta: number = this._getStateDelta(periodStart, periodEnd, this._primaryStatistics, this.battery.mainEntities);
    const batteryExportDelta: number = this._getStateDelta(periodStart, periodEnd, this._primaryStatistics, this.battery.returnEntities);
    const gridImportDelta: number = this._getStateDelta(periodStart, periodEnd, this._primaryStatistics, this.grid.mainEntities);
    const gridExportDelta: number = this._getStateDelta(periodStart, periodEnd, this._primaryStatistics, this.grid.returnEntities);
    const flowDeltas: Flows = this._calculateFlows(solarImportDelta, batteryImportDelta, batteryExportDelta, gridImportDelta, gridExportDelta);

    states.batteryImport += batteryImportDelta;
    states.batteryExport += batteryExportDelta;
    states.gridImport += gridImportDelta;
    states.gridExport += gridExportDelta;
    states.solarImport += solarImportDelta;
    // TODO: devices

    states.flows.batteryToGrid += flowDeltas.batteryToGrid;
    states.flows.solarToGrid += flowDeltas.solarToGrid;
    states.flows.gridToBattery += flowDeltas.gridToBattery;
    states.flows.solarToBattery += flowDeltas.solarToBattery;
    states.flows.batteryToHome += flowDeltas.batteryToHome;
    states.flows.gridToHome += flowDeltas.gridToHome;
    states.flows.solarToHome += flowDeltas.solarToHome;

    const highCarbonDelta: number = this.lowCarbon.isPresent ? gridImportDelta * Number(this.hass.states[this.lowCarbon.firstMainEntity!].state) / 100 : 0;
    states.highCarbon += highCarbonDelta;

    states.batterySecondary += this._getStateDelta(periodStart, periodEnd, this._secondaryStatistics, this.battery.secondary.mainEntities);
    states.gasSecondary += this._getStateDelta(periodStart, periodEnd, this._secondaryStatistics, this.gas.secondary.mainEntities);
    states.gridSecondary += this._getStateDelta(periodStart, periodEnd, this._secondaryStatistics, this.grid.secondary.mainEntities);
    states.homeSecondary += this._getStateDelta(periodStart, periodEnd, this._secondaryStatistics, this.home.secondary.mainEntities);
    states.lowCarbonSecondary += this._getStateDelta(periodStart, periodEnd, this._secondaryStatistics, this.lowCarbon.secondary.mainEntities);
    states.solarSecondary += this._getStateDelta(periodStart, periodEnd, this._secondaryStatistics, this.solar.secondary.mainEntities);
    this.devices.forEach((device, index) => states.devicesSecondary[index] += this._getStateDelta(periodStart, periodEnd, this._secondaryStatistics, device.secondary.mainEntities));
  }

  //================================================================================================================================================================================//

  private _getStateDelta(periodStart: Date, periodEnd: Date, statistics: Statistics | undefined, entityIds: string[] | undefined): number {
    if (!statistics || !entityIds?.length) {
      return 0;
    }

    // TODO: support all entities
    const entityId: string = entityIds[0];
    const stateObj: HassEntity = this.hass.states[entityId];

    if (!stateObj) {
      return 0;
    }

    const lastChanged: number = Date.parse(stateObj.last_changed);

    if (lastChanged >= periodStart.getTime() && lastChanged <= periodEnd.getTime()) {
      const entityStats: StatisticValue[] = statistics[entityId];
      const state: number = Number(stateObj.state);

      if (!entityStats || entityStats.length == 0) {
        return state;
      }

      const units = stateObj.attributes.unit_of_measurement;
      return this._toWattHours(units, state - (entityStats[entityStats.length - 1].state ?? 0));
    }

    return 0;
  }

  //================================================================================================================================================================================//

  private _subscribe(config: EnergyFlowCardExtConfig) {
    const start: number = Date.now();

    const getEnergyDataCollectionPoll = (
      resolve: (value: EnergyCollection | PromiseLike<EnergyCollection>) => void,
      reject: (reason?: any) => void
    ) => {
      const energyCollection = getEnergyDataCollection(this.hass);

      if (energyCollection) {
        console.log("Got EnergyCollection");
        resolve(energyCollection);
      } else if (Date.now() - start > ENERGY_DATA_TIMEOUT) {
        console.debug(getEnergyDataCollection(this.hass));
        reject(new Error("No energy data received."));
      } else {
        setTimeout(() => getEnergyDataCollectionPoll(resolve, reject), 100);
      }
    };

    setTimeout(
      () => {
        if (!this._error && !this._primaryStatistics && !this._secondaryStatistics) {
          this._error = new Error("No energy data received.");
        }
      },
      ENERGY_DATA_TIMEOUT * 2);

    new Promise<EnergyCollection>(getEnergyDataCollectionPoll)
      .catch(err => this._error = err)
      .then(async (collection: EnergyCollection) => {
        console.log("Thenable called");

        return collection.subscribe(async (data: EnergyData) => {
          console.log("subscribe callback");
          this._energyData = data;

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
          this._loadStatistics(periodStart, periodEnd, period);
        });
      });
  }

  //================================================================================================================================================================================//

  private async _loadStatistics(periodStart: Date, periodEnd: Date, period: '5minute' | 'hour' | 'day' | 'week' | 'month') {
    const [previousPrimaryData, primaryData]: Statistics[] = await Promise.all([
      this._fetchStatistics(addHours(periodStart, -1), periodStart, this._primaryEntityIds, 'hour'),
      this._fetchStatistics(periodStart, periodEnd, this._primaryEntityIds, period)
    ]);

    logDebug("Received primary stats for period [" + periodStart + " - " + periodEnd + "] @ " + new Date());

    if (this.lowCarbon.isPresent) {
      this._co2data = await this._fetchCo2Data(periodStart, periodEnd, period);
    }

    this._validateStatistics(this._primaryEntityIds, primaryData, previousPrimaryData, periodStart, periodEnd);
    this._primaryStatistics = primaryData;
    this._calculatePrimaryStatistics();

    if (this._secondaryEntityIds.length !== 0) {
      const [previousSecondaryData, secondaryData]: Statistics[] = await Promise.all([
        this._fetchStatistics(addHours(periodStart, -1), periodStart, this._secondaryEntityIds, 'hour'),
        this._fetchStatistics(periodStart, periodEnd, this._secondaryEntityIds, 'day')
      ]);

      logDebug("Received secondary stats for period [" + periodStart + " - " + periodEnd + "] @ " + new Date());
      this._validateStatistics(this._secondaryEntityIds, secondaryData, previousSecondaryData, periodStart, periodEnd);
      this._secondaryStatistics = secondaryData;
      this._calculateSecondaryStatistics();
    }
  }

  //================================================================================================================================================================================//

  private async _inferEntityModes(): Promise<void> {
    const statistics: Statistics = await this._fetchStatistics(addDays(startOfDay(new Date()), -1), null, [...this._primaryEntityIds, ...this._secondaryEntityIds], 'day');

    for (const entity in statistics) {
      if (statistics[entity].length !== 0) {
        const firstStat: StatisticValue = statistics[entity][0];
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

  //================================================================================================================================================================================//

  private _isMisconfiguredResettingSensor(stat: StatisticValue): boolean {
    const change: number = round(stat.change || 0, 6);
    const state: number = round(stat.state || 0, 6);
    return change > state || change < 0;
  }

  //================================================================================================================================================================================//

  private _isTotalisingSensor(stat: StatisticValue): boolean {
    const change: number = round(stat.change || 0, 6);
    const state: number = round(stat.state || 0, 6);
    return change >= 0 && change < state;
  }

  //================================================================================================================================================================================//

  private _calculatePrimaryStatistics(): void {
    if (!this._primaryStatistics) {
      return;
    }

    const combinedStats: Map<number, Map<string, number>> = new Map();

    if (this.grid.isPresent) {
      this._addFlowStats(this._primaryStatistics, combinedStats, this.grid.mainEntities);
      this._addFlowStats(this._primaryStatistics, combinedStats, this.grid.returnEntities);
    }

    if (this.battery.isPresent) {
      this._addFlowStats(this._primaryStatistics, combinedStats, this.battery.mainEntities);
      this._addFlowStats(this._primaryStatistics, combinedStats, this.battery.returnEntities);
    }

    if (this.solar.isPresent) {
      this._addFlowStats(this._primaryStatistics, combinedStats, this.solar.mainEntities);
    }

    let solarToHome: number = 0;
    let gridToHome: number = 0;
    let gridToBattery: number = 0;
    let batteryToGrid: number = 0;
    let batteryToHome: number = 0;
    let solarToBattery: number = 0;
    let solarToGrid: number = 0;
    let solarProduction: number = 0;
    let gridImport: number = 0;
    let gridExport: number = 0;
    let batteryImport: number = 0;
    let batteryExport: number = 0;

    combinedStats.forEach((entry, timestamp) => {
      const sp: number = this._getStates(entry, this.solar.mainEntities);
      const bi: number = this._getStates(entry, this.battery.mainEntities);
      const be: number = this._getStates(entry, this.battery.returnEntities);
      const gi: number = this._getStates(entry, this.grid.mainEntities);
      const ge: number = this._getStates(entry, this.grid.returnEntities);
      const flows: Flows = this._calculateFlows(sp, bi, be, gi, ge);

      solarToHome += flows.solarToHome;
      gridToHome += flows.gridToHome;
      gridToBattery += flows.gridToBattery;
      batteryToGrid += flows.batteryToGrid;
      batteryToHome += flows.batteryToHome;
      solarToBattery += flows.solarToBattery;
      solarToGrid += flows.solarToGrid;
      solarProduction += sp;
      gridImport += gi;
      gridExport += ge;
      batteryImport += bi;
      batteryExport += be;
    });

    if (this.grid.isPresent) {
      if (this.grid.powerOutage.isOutage) {
        this.grid.state.import = 0;
        this.grid.state.export = 0;
        this.grid.state.fromBattery = 0;
        this.grid.state.fromSolar = 0;
        this.grid.state.highCarbon = 0;
        this.home.state.fromGrid = 0;
      } else {
        this.grid.state.import = gridImport;
        this.grid.state.export = gridExport;

        if (this.battery.isPresent) {
          this.grid.state.fromBattery = batteryToGrid;
        }

        if (this.solar.isPresent) {
          this.grid.state.fromSolar = solarToGrid;
        }

        if (this.lowCarbon.isPresent && this._co2data) {
          const units: string | undefined = this._getUnits(this.grid.mainEntities);
          this.grid.state.highCarbon = this._toWattHours(units, Object.values(this._co2data).reduce((sum, a) => sum + a, 0));
        }

        this.home.state.fromGrid = gridToHome;
      }
    } else {
      this.home.state.fromGrid = 0;
    }

    if (this.battery.isPresent) {
      this.battery.state.import = batteryImport;
      this.battery.state.export = batteryExport;

      if (this.grid.isPresent) {
        this.battery.state.fromGrid = gridToBattery;
      }

      if (this.solar.isPresent) {
        this.battery.state.fromSolar = solarToBattery;
      }

      this.home.state.fromBattery = batteryToHome;
    } else {
      this.home.state.fromBattery = 0;
    }

    if (this.solar.isPresent) {
      this.solar.state.import = solarProduction;
      this.home.state.fromSolar = solarToHome;
    } else {
      this.home.state.fromSolar = 0;
    }
  }

  //================================================================================================================================================================================//

  private _calculateSecondaryStatistics(): void {
    if (!this._secondaryStatistics) {
      return;
    }

    this._setSecondaryStatistic(this.battery)
    this._setSecondaryStatistic(this.gas)
    this._setSecondaryStatistic(this.grid)
    this._setSecondaryStatistic(this.home)
    this._setSecondaryStatistic(this.lowCarbon)
    this._setSecondaryStatistic(this.solar)
    this.devices.forEach(device => this._setSecondaryStatistic(device));
  }

  //================================================================================================================================================================================//

  private _setSecondaryStatistic(state: ValueState): void {
    if (!state.secondary.isPresent) {
      return;
    }

    // TODO multiple entities
    const entityId: string = state.secondary.mainEntities[0]!;
    const entityStats: StatisticValue[] = this._secondaryStatistics![entityId];

    if (entityStats.length > 0) {
      const stateObj: HassEntity = this.hass.states[entityId];
      const units: string | undefined = state.secondary.config?.[EntitiesOptions.Entities]?.[EntityOptions.Units] || stateObj.attributes.unit_of_measurement;
      const threshold: number = state.secondary.config?.[EntitiesOptions.Entities]?.[EntityOptions.Zero_Threshold] || 0;
      const secondaryState: number = entityStats.map(stat => stat.change || 0).reduce((result, change) => result + change, 0) || 0;
      state.secondary.state = this._toWattHours(units, threshold >= secondaryState ? secondaryState : 0);
    }
  }

  //================================================================================================================================================================================//

  private _addFlowStats(statistics: Statistics, combinedStats: Map<number, Map<string, number>>, entityIds: string[] | undefined): void {
    if (!entityIds?.length) {
      return;
    }

    // TODO: support multiple entities
    const entityStats: Map<number, number> = this._getEntityStatistics(this.hass, statistics, entityIds);
    const entityId: string = entityIds[0];

    entityStats.forEach((value, timestamp) => {
      let entry: Map<string, number> | undefined = combinedStats.get(timestamp);

      if (!entry) {
        entry = new Map();
      }

      entry.set(entityId, value);
      combinedStats.set(timestamp, entry);
    });
  }

  //================================================================================================================================================================================//

  private _getStates(entry: Map<string, number>, entityIds: string[] | undefined): number {
    if (!entityIds?.length) {
      return 0;
    }

    // TODO: support multiple entries
    const entity: string = entityIds[0];
    return entry.get(entity)!;
  }

  //================================================================================================================================================================================//

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

  //================================================================================================================================================================================//

  private _populateEntityArrays(config: EnergyFlowCardExtConfig): void {
    this._primaryEntityIds = [];
    this._secondaryEntityIds = [];

    [this.battery, this.gas, this.grid, this.home, this.solar, ...this.devices].forEach(state => {
      this._primaryEntityIds.push(...state.mainEntities);

      if (state["returnEntities"]) {
        this._primaryEntityIds.push(...state["returnEntities"]);
      }

      this._secondaryEntityIds.push(...state.secondary.mainEntities);
    });
  }

  //================================================================================================================================================================================//

  private _validateStatistics(entityIds: string[], currentStatistics: Statistics, previousStatistics: Statistics, periodStart: Date, periodEnd: Date): void {
    entityIds.forEach(entity => {
      let entityStats: StatisticValue[] = currentStatistics[entity];
      let idx: number = 0;

      if (!entityStats || entityStats.length == 0 || entityStats[0].start > periodStart.getTime()) {
        let dummyStat: StatisticValue;

        if (previousStatistics && previousStatistics[entity]?.length) {
          // This entry is the final stat prior to the period we are interested in.  It is only needed for the case where we need to calculate the
          // Live/Hybrid-mode state-delta at midnight on the current date (ie, before the first stat of the new day has been generated) so we do
          // not want to include its values in the stats calculations.
          const previousStat: StatisticValue = previousStatistics[entity][0];

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

        if (entityStats) {
          entityStats.unshift(dummyStat);
        } else {
          entityStats = new Array(dummyStat);
          currentStatistics[entity] = entityStats;
        }

        idx++;
      }

      if (entityStats.length > idx) {
        let lastState: number = 0;

        entityStats.forEach(stat => {
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

  //================================================================================================================================================================================//

  private _fetchStatistics(periodStart: Date, periodEnd?: Date | null, entityIds?: string[], period: '5minute' | 'hour' | 'day' | 'week' | 'month' = 'hour'): Promise<Statistics> {
    return this.hass.callWS<Statistics>({
      type: 'recorder/statistics_during_period',
      start_time: periodStart.toISOString(),
      end_time: periodEnd?.toISOString(),
      statistic_ids: entityIds,
      period: period
    });
  }

  //================================================================================================================================================================================//

  private _fetchCo2Data(periodStart: Date, periodEnd?: Date | null, period: '5minute' | 'hour' | 'day' | 'week' | 'month' = 'hour'): Promise<Record<string, number>> {
    return this.hass.callWS<Record<string, number>>({
      type: "energy/fossil_energy_consumption",
      start_time: periodStart.toISOString(),
      end_time: periodEnd?.toISOString(),
      energy_statistic_ids: this.grid.mainEntities,
      co2_statistic_id: this.lowCarbon.firstMainEntity,
      period
    });
  };

  //================================================================================================================================================================================//

  private _getEntityStatistics(hass: HomeAssistant, statistics: Statistics, entityIds: string[] | undefined): Map<number, number> {
    if (!entityIds?.length) {
      return new Map();
    }

    const entityStats: Map<number, number> = new Map();

    entityIds.forEach(entity => {
      const stateObj: HassEntity = hass.states[entity];

      if (stateObj) {
        const statisticsForEntity: StatisticValue[] = statistics[entity];

        if (statisticsForEntity && statisticsForEntity.length != 0) {
          statisticsForEntity.map((entry) => {
            const state = this._toWattHours(stateObj.attributes.unit_of_measurement, entry.change || 0);
            entityStats.set(entry.start, (entityStats.get(entry.start) || 0) + state);
          });
        }
      }
    });

    return entityStats;
  };

  //================================================================================================================================================================================//

  private _getUnits(entityIds: string[]): string | undefined {
    return this.hass.states[entityIds[0]].attributes.unit_of_measurement;
  }

  //================================================================================================================================================================================//

  private _toWattHours(units: string | undefined, value: number): number {
    if (units?.toUpperCase().startsWith("KWH")) {
      return value * 1000;
    }

    if (units?.toUpperCase().startsWith("MWH")) {
      return value * 1000000;
    }

    return value;
  };
}
