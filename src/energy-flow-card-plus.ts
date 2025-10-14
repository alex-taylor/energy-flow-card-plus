/* eslint-disable @typescript-eslint/no-explicit-any */
import { html, LitElement, PropertyValues, svg, TemplateResult } from "lit";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { formatNumber, HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import { Decimal } from "decimal.js";
import { customElement, property, state } from "lit/decorators.js";
import { upgradeConfig, getDefaultConfig } from "./config/config";
import { EnergyCollection, EnergyData, getEnergyDataCollection, getStatistics, Statistics } from "./energy";
import { SubscribeMixin } from "./energy/subscribe-mixin";
import { HomeAssistantReal } from "./hass";
import localize from "./localize/localize";
import { styles } from "./style";
import type { BasicEntity, EnergyFlowCardPlusConfig } from "./config";
import { BatteryEntity } from "./entities/battery-entity";
import { GridEntity } from "./entities/grid-entity";
import { SolarEntity } from "./entities/solar-entity";
import { SecondaryInfoEntity } from "./entities/secondary-info-entity";
import { clampStateValue, coerceNumber, isNumberValue, mapRange } from "./utils";
import { registerCustomCard } from "./utils/register-custom-card";
import { Flows, calculateStatisticsFlows, getLiveDeltas } from "./flows";
import { entityExists, getEntityState, getEntityStateWattHours } from "./entities";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { differenceInDays, startOfDay } from 'date-fns';
import { ColorMode, DisplayMode, EntityType } from "./enums";
import { HomeEntity } from "./entities/home-entity";
import { IndividualEntity } from "./entities/individual-entity";
import { FossilFuelEntity } from "./entities/fossil-fuel-entity";
import { Entity } from "./entities/entity";

registerCustomCard({
  type: "energy-flow-card-plus",
  name: "Energy Flow Card Plus",
  description: "A custom card for displaying energy flow in Home Assistant. Inspired by the official Energy Distribution Card.",
});

const energyDataTimeout: number = 10000;
const CIRCLE_CIRCUMFERENCE: number = 238.76104;
const DOT_SIZE_STANDARD: number = 1;
const DOT_SIZE_INDIVIDUAL: number = 2.4;

@customElement("energy-flow-card-plus")
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class EnergyFlowCardPlus extends SubscribeMixin(LitElement) {
  static styles = styles;

  public static getStubConfig(hass: HomeAssistant): Record<string, unknown> {
    return getDefaultConfig(hass);
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ui-editor/ui-editor");
    return document.createElement("energy-flow-card-plus-editor");
  }

  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistantReal;

  @state() private _config!: EnergyFlowCardPlusConfig;
  @state() private _entitiesArr: string[] = [];
  @state() private _error?: Error;
  @state() private _energyData?: EnergyData;
  @state() private _width = 0;
  @state() private _statistics?: Statistics;
  @state() private _loading: boolean = false;

  private _grid!: GridEntity;
  private _solar!: SolarEntity;
  private _battery!: BatteryEntity;
  private _home!: HomeEntity;
  private _individual1!: IndividualEntity;
  private _individual2!: IndividualEntity;
  private _fossilFuel!: FossilFuelEntity;
  private _previousDur: { [name: string]: number } = {};

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    this.initEntities(this._config);
    const start = Date.now();

    const getEnergyDataCollectionPoll = (
      resolve: (value: EnergyCollection | PromiseLike<EnergyCollection>) => void,
      reject: (reason?: any) => void
    ) => {
      const energyCollection = getEnergyDataCollection(this.hass);

      if (energyCollection) {
        resolve(energyCollection);
      } else if (Date.now() - start > energyDataTimeout) {
        console.debug(getEnergyDataCollection(this.hass));
        reject(new Error("No energy data received."));
      } else {
        setTimeout(() => getEnergyDataCollectionPoll(resolve, reject), 100);
      }
    };

    const energyPromise = new Promise<EnergyCollection>(getEnergyDataCollectionPoll);

    setTimeout(() => {
      if (!this._error && !this._statistics) {
        this._error = new Error("No energy data received.");
        console.debug(getEnergyDataCollection(this.hass));
      }
    }, energyDataTimeout * 2);

    energyPromise.catch((err) => this._error = err);

    return [
      energyPromise.then(async (collection: EnergyCollection) => {
        this._loading = true;

        return collection.subscribe(async (data: EnergyData) => {
          this._energyData = data;

          if (this._entitiesArr) {
            let periodStart: Date;
            let periodEnd: Date;

            if (this._config.display_mode === DisplayMode.Live) {
              periodEnd = new Date();
              periodStart = startOfDay(periodEnd);
            } else {
              periodStart = data.start;
              periodEnd = data.end ?? new Date();
            }

            const dayDifference: number = differenceInDays(periodEnd, periodStart);
            const period = this._config.use_hourly_stats || dayDifference <= 2 ? 'hour' : 'day';
            this._statistics = await getStatistics(this.hass, periodStart, periodEnd, this._entitiesArr, period);
            calculateStatisticsFlows(this.hass, this._statistics, this._solar, this._battery, this._grid);
            this._loading = false;
          }
        });
      }),
    ];
  }

  public setConfig(config: EnergyFlowCardPlusConfig): void {
    if (typeof config !== "object") {
      throw new Error(localize("common.invalid_configuration"));
    }

    if (!config.entities || (!config.entities?.battery?.entity && !config.entities?.grid?.entity && !config.entities?.solar?.entity)) {
      throw new Error("At least one entity for battery, grid or solar must be defined");
    }

    this._config = upgradeConfig(config);
    this.populateEntitiesArr();
    this.resetSubscriptions();
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (this._loading) {
      return html`<ha-card style="padding: 2rem">${this.hass.localize("ui.panel.lovelace.cards.energy.loading")}</ha-card>`;
    }

    if (!this._energyData && this._config.display_mode !== DisplayMode.Live) {
      return html`<ha-card style="padding: 2rem">
        ${this.hass.localize("ui.panel.lovelace.cards.energy.loading")}<br />Make sure you have the Energy Integration setup and a Date Selector in this View or set
        <pre>display_mode: live</pre>
        </ha-card>`;
    }

    const entities = this._config.entities;

    // show pointer if clickable entities is enabled
    this.style.setProperty("--clickable-cursor", this._config.clickable_entities ? "pointer" : "default");

    const grid: GridEntity = this._grid;
    const solar: SolarEntity = this._solar;
    const battery: BatteryEntity = this._battery;
    const home: HomeEntity = this._home;
    const individual1: IndividualEntity = this._individual1;
    const individual2: IndividualEntity = this._individual2;
    const fossilFuel: FossilFuelEntity = this._fossilFuel;

    // Override in case of Power Outage
    if (grid.powerOutage.isOutage && grid.powerOutage.icon) {
      grid.icon = grid.powerOutage.icon;
    }

    // Update Color of Grid Consumption
    if (grid.color.fromGrid) {
      if (typeof grid.color.fromGrid === "object") {
        grid.color.fromGrid = this.convertColorListToHex(grid.color.fromGrid);
      }

      this.style.setProperty("--energy-grid-consumption-color", grid.color.fromGrid || "var(--energy-grid-consumption-color)" || "#488fc2");
    }

    // Update Color of Grid Production
    if (grid.color.toGrid) {
      if (typeof grid.color.toGrid === "object") {
        grid.color.toGrid = this.convertColorListToHex(grid.color.toGrid);
      }

      this.style.setProperty("--energy-grid-return-color", grid.color.toGrid || "#a280db");
    }

    // Update and Set Color of Grid Icon
    this.style.setProperty(
      "--icon-grid-color",
      grid.color.colorIcon === ColorMode.Consumption
        ? "var(--energy-grid-consumption-color)"
        : grid.color.colorIcon === ColorMode.Production
          ? "var(--energy-grid-return-color)"
          : grid.color.colorIcon === ColorMode.Color_Dynamically
            ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Grid Name
    this.style.setProperty(
      "--secondary-text-grid-color",
      grid.secondary.colorType === ColorMode.Consumption
        ? "var(--energy-grid-consumption-color)"
        : grid.secondary.colorType === ColorMode.Production
          ? "var(--energy-grid-return-color)"
          : grid.secondary.colorType === ColorMode.Color_Dynamically
            ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Grid Circle
    this.style.setProperty(
      "--circle-grid-color",
      grid.color.colorCircle === ColorMode.Consumption
        ? "var(--energy-grid-consumption-color)"
        : grid.color.colorCircle === ColorMode.Production
          ? "var(--energy-grid-return-color)"
          : grid.color.colorCircle === ColorMode.Color_Dynamically
            ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)"
            : "var(--energy-grid-consumption-color)"
    );

    // Update States Values of Individuals
    individual1.state = individual1.isPresent ? this.getEntityStateWattHours(entities.individual1?.entity) : 0;
    individual2.state = individual2.isPresent ? this.getEntityStateWattHours(entities.individual2?.entity) : 0;

    // Update and Set Color of Individuals
    if (individual1.color) {
      if (typeof individual1.color === "object") {
        individual1.color = this.convertColorListToHex(individual1.color);
      }

      this.style.setProperty("--individualone-color", individual1.color); // dynamically update color of entity depending on user's input
    }

    if (individual2.color) {
      if (typeof individual2.color === "object") {
        individual2.color = this.convertColorListToHex(individual2.color);
      }

      this.style.setProperty("--individualtwo-color", individual2.color); // dynamically update color of entity depending on user's input
    }

    // Update and Set Color of Individuals Icon
    this.style.setProperty("--icon-individualone-color", entities.individual1?.color_icon ? "var(--individualone-color)" : "var(--primary-text-color)");
    this.style.setProperty("--icon-individualtwo-color", entities.individual2?.color_icon ? "var(--individualtwo-color)" : "var(--primary-text-color)");

    //individual1.secondary.state = this.getSecondaryState(individual1.secondary, EntityType.Individual1_Secondary);
    //individual2.secondary.state = this.getSecondaryState(individual2.secondary, EntityType.Individual2_Secondary);
    //solar.secondary.state = this.getSecondaryState(solar.secondary, EntityType.Solar_Secondary);
    //home.secondary.state = this.getSecondaryState(home.secondary, EntityType.HomeSecondary);
    //fossilFuel.secondary.state = this.getSecondaryState(fossilFuel.secondary, EntityType.Non_Fossil_Secondary);
    //grid.secondary.state = this.getSecondaryState(grid.secondary, EntityType.Grid_Secondary);

    // Update and Set Color of Solar
    if (entities.solar?.color !== undefined) {
      let solarColor = entities.solar?.color;

      if (typeof solarColor === "object") {
        solarColor = this.convertColorListToHex(solarColor);
      }

      this.style.setProperty("--energy-solar-color", solarColor || "#ff9800");
    }

    this.style.setProperty("--icon-solar-color", entities.solar?.color_icon ? "var(--energy-solar-color)" : "var(--primary-text-color)");

    let solarToHome: number = solar.state.toHome;
    let solarToGrid: number = solar.state.toGrid;
    let solarToBattery: number = solar.state.toBattery;
    let solarTotal: number = solar.state.total;
    let gridToBattery: number = grid.state.toBattery;
    let gridToHome: number = grid.state.toHome;
    let gridToGrid: number = grid.state.toGrid;
    let gridFromGrid: number = grid.state.fromGrid;
    let batteryToGrid: number = battery.state.toGrid;
    let batteryToHome: number = battery.state.toHome;
    let batteryToBattery: number = battery.state.toBattery;
    let batteryFromBattery: number = battery.state.fromBattery;

    // unless we're in 'history' mode, we need to bring the stats right up to date by taking the current values of the sensors
    if (this._config?.display_mode !== DisplayMode.History && this._statistics) {
      let start: Date;
      let end: Date;

      if (this._config.display_mode === DisplayMode.Hybrid) {
        start = this._energyData?.start ?? new Date();
        end = this._energyData?.end ?? new Date();
      } else {
        end = new Date();
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      }

      const deltas: Flows = getLiveDeltas(this.hass, start, end, this._statistics, solar, battery, grid);

      solarToHome += deltas.solarToHome;
      solarToGrid += deltas.solarToGrid;
      solarToBattery += deltas.solarToBattery;
      solarTotal += deltas.solarToHome + deltas.solarToGrid + deltas.solarToBattery;

      gridToBattery += deltas.gridToBattery;
      gridToHome += deltas.gridToHome;
      gridFromGrid += deltas.gridToBattery + deltas.gridToHome;
      gridToGrid += deltas.solarToGrid + deltas.batteryToGrid;

      batteryToGrid += deltas.batteryToGrid;
      batteryToHome += deltas.batteryToHome;
      batteryFromBattery += deltas.batteryToGrid + deltas.batteryToHome;
      batteryToBattery += deltas.solarToBattery + deltas.gridToBattery;
    }

    // Calculate Sum of All Sources to get Total Home Consumption
    let totalHomeConsumption: number = gridFromGrid + batteryFromBattery + solarTotal - gridToGrid - batteryToBattery;
    let homeConsumptionError: boolean = false;

    if (totalHomeConsumption < 0) {
      totalHomeConsumption = 0;
      homeConsumptionError = true;
    }

    const energyIn: number = solarToHome + batteryToHome + gridToHome;
    const scale: number = totalHomeConsumption / energyIn;

    solarToHome *= scale;
    batteryToHome *= scale;
    gridToHome *= scale;

    // Update and Set Color of Battery Consumption
    if (battery.color.fromBattery !== undefined) {
      if (typeof battery.color.fromBattery === "object") {
        battery.color.fromBattery = this.convertColorListToHex(battery.color.fromBattery);
      }

      this.style.setProperty("--energy-battery-out-color", battery.color.fromBattery || "#4db6ac");
    }

    // Update and Set Color of Battery Production
    if (battery.color.toBattery !== undefined) {
      if (typeof battery.color.toBattery === "object") {
        battery.color.toBattery = this.convertColorListToHex(battery.color.toBattery);
      }

      this.style.setProperty("--energy-battery-in-color", battery.color.toBattery || "#a280db");
    }

    // Update and Set Color of Battery Icon
    this.style.setProperty(
      "--icon-battery-color",
      battery.color.iconType === ColorMode.Consumption
        ? "var(--energy-battery-in-color)"
        : battery.color.iconType === ColorMode.Production
          ? "var(--energy-battery-out-color)"
          : battery.color.iconType === ColorMode.Color_Dynamically
            ? batteryFromBattery >= batteryToBattery
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Battery State of Charge
    this.style.setProperty(
      "--text-battery-state-of-charge-color",
      battery.color.stateOfChargeType === ColorMode.Consumption
        ? "var(--energy-battery-in-color)"
        : battery.color.stateOfChargeType === ColorMode.Production
          ? "var(--energy-battery-out-color)"
          : battery.color.stateOfChargeType === ColorMode.Color_Dynamically
            ? batteryFromBattery >= batteryToBattery
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Battery Circle
    this.style.setProperty(
      "--circle-battery-color",
      battery.color.circleType === ColorMode.Consumption
        ? "var(--energy-battery-in-color)"
        : battery.color.circleType === ColorMode.Production
          ? "var(--energy-battery-out-color)"
          : battery.color.circleType === ColorMode.Color_Dynamically
            ? batteryFromBattery >= batteryToBattery
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)"
            : "var(--energy-battery-in-color)"
    );

    // Calculate Sum of Both Individual Devices's State Values
    const totalIndividualConsumption = coerceNumber(individual1.state, 0) + coerceNumber(individual2.state, 0);

    // Calculate Circumference of Semi-Circles
    let homeBatteryCircumference: number = 0;

    if (batteryToHome) {
      homeBatteryCircumference = CIRCLE_CIRCUMFERENCE * (batteryToHome / totalHomeConsumption);
    }

    let homeSolarCircumference: number = 0;

    if (solar.isPresent) {
      homeSolarCircumference = CIRCLE_CIRCUMFERENCE * (solarToHome / totalHomeConsumption);
    }

    let homeGridCircumference: number | undefined;
    let fossilFuelEnergy: number | undefined;
    let homeFossilCircumference: number | undefined;

    const totalLines = solarToHome + solarToGrid + solarToBattery + gridToHome + gridToBattery + batteryToHome + batteryToGrid;

    const newDur = {
      batteryToGrid: this.circleRate(batteryToGrid ?? 0, totalLines),
      batteryToHome: this.circleRate(batteryToHome ?? 0, totalLines),
      gridToHome: this.circleRate(gridToHome, totalLines),
      gridToBattery: this.circleRate(gridToBattery ?? 0, totalLines),
      solarToBattery: this.circleRate(solarToBattery ?? 0, totalLines),
      solarToGrid: this.circleRate(solarToGrid ?? 0, totalLines),
      solarToHome: this.circleRate(solarToHome ?? 0, totalLines),
      individual1: this.circleRate(individual1.state ?? 0, totalIndividualConsumption),
      individual2: this.circleRate(individual2.state ?? 0, totalIndividualConsumption),
      lowCarbon: this.circleRate(fossilFuelEnergy ?? 0, totalLines),
    };

    ["batteryGrid", "batteryToHome", "gridToHome", "solarToBattery", "solarToGrid", "solarToHome"].forEach((flowName) => {
      const flowSVGElement = this[`${flowName}Flow`] as SVGSVGElement;

      if (flowSVGElement && this._previousDur[flowName] && this._previousDur[flowName] !== newDur[flowName]) {
        flowSVGElement.pauseAnimations();
        flowSVGElement.setCurrentTime(flowSVGElement.getCurrentTime() * (newDur[flowName] / this._previousDur[flowName]));
        flowSVGElement.unpauseAnimations();
      }

      this._previousDur[flowName] = newDur[flowName];
    });

    let nonFossilColor = entities.fossil_fuel_percentage?.color;

    if (nonFossilColor !== undefined) {
      if (typeof nonFossilColor === "object") {
        nonFossilColor = this.convertColorListToHex(nonFossilColor);
      }

      this.style.setProperty("--non-fossil-color", nonFossilColor ?? "var(--energy-non-fossil-color)");
    }

    this.style.setProperty("--icon-non-fossil-color", entities.fossil_fuel_percentage?.color_icon ? "var(--non-fossil-color)" : "var(--primary-text-color)" ?? "var(--non-fossil-color)");

    const homeSources = {
      battery: {
        value: batteryToHome,
        color: "var(--energy-battery-out-color)",
      },
      solar: {
        value: solarToHome,
        color: "var(--energy-solar-color)",
      },
      grid: {
        value: gridToHome,
        color: "var(--energy-grid-consumption-color)",
      },
      gridNonFossil: {
        // TODO: doesn't work and never has
        value: fossilFuelEnergy ?? 0,
        color: "var(--energy-non-fossil-color)",
      }
    };

    let iconHomeColor;
    let textHomeColor;

    /* return source object with largest value property */
    const homeLargestSource: string = Object.keys(homeSources).reduce((a, b) => homeSources[a].value > homeSources[b].value ? a : b);
    const homeValueIsZero: boolean = homeSources[homeLargestSource].value == 0;

    if (homeConsumptionError || homeValueIsZero) {
      iconHomeColor = "var(--primary-text-color)";
      textHomeColor = "var(--primary-text-color)";
    } else {
      switch (entities.home?.color_of_icon) {
        case ColorMode.Solar:
          iconHomeColor = "var(--energy-solar-color)";
          break;

        case ColorMode.Battery:
          iconHomeColor = "var(--energy-battery-out-color)";
          break;

        case ColorMode.Grid:
          iconHomeColor = "var(--energy-grid-consumption-color)";
          break;

        case ColorMode.Color_Dynamically:
          iconHomeColor = homeSources[homeLargestSource].color;
          break;

        default:
          iconHomeColor = "var(--primary-text-color)";
          break;
      }

      switch (entities.home?.color_of_value) {
        case ColorMode.Solar:
          textHomeColor = "var(--energy-solar-color)";
          break;

        case ColorMode.Battery:
          textHomeColor = "var(--energy-battery-out-color)";
          break;

        case ColorMode.Grid:
          textHomeColor = "var(--energy-grid-consumption-color)";
          break;

        case ColorMode.Color_Dynamically:
          textHomeColor = homeSources[homeLargestSource].color;
          break;

        default:
          textHomeColor = "var(--primary-text-color)";
          break;
      }
    }

    this.style.setProperty("--icon-home-color", iconHomeColor);
    this.style.setProperty("--text-home-color", textHomeColor);
    this.style.setProperty("--text-solar-color", entities.solar?.color_value ? "var(--energy-solar-color)" : "var(--primary-text-color)");
    this.style.setProperty("--text-non-fossil-color", entities.fossil_fuel_percentage?.color_value ? "var(--non-fossil-color)" : "var(--primary-text-color)");
    this.style.setProperty("--secondary-text-non-fossil-color", entities.fossil_fuel_percentage?.secondary_info?.color_of_value ? "var(--non-fossil-color)" : "var(--primary-text-color)");
    this.style.setProperty("--text-individualone-color", entities.individual1?.color_value ? "var(--individualone-color)" : "var(--primary-text-color)");
    this.style.setProperty("--text-individualtwo-color", entities.individual2?.color_value ? "var(--individualtwo-color)" : "var(--primary-text-color)");
    this.style.setProperty("--secondary-text-individualone-color", entities.individual1?.secondary_info?.color_of_value ? "var(--individualone-color)" : "var(--primary-text-color)");
    this.style.setProperty("--secondary-text-individualtwo-color", entities.individual2?.secondary_info?.color_of_value ? "var(--individualtwo-color)" : "var(--primary-text-color)");
    this.style.setProperty("--secondary-text-solar-color", entities.solar?.secondary_info?.color_of_value ? "var(--energy-solar-color)" : "var(--primary-text-color)");
    this.style.setProperty("--secondary-text-home-color", entities.home?.secondary_info?.color_of_value ? "var(--text-home-color)" : "var(--primary-text-color)");

    let homeUsageToDisplay: string;

    if (homeConsumptionError) {
      homeUsageToDisplay = localize("common.unknown");
    } else {
      const homeUsageState: number =
        entities.home?.override_state && entities.home.entity
          ? entities.home?.subtract_individual
            ? this.getEntityStateWattHours(entities.home.entity) - totalIndividualConsumption
            : this.getEntityStateWattHours(entities.home.entity)
          : entities.home?.subtract_individual
            ? totalHomeConsumption - totalIndividualConsumption || 0
            : totalHomeConsumption

      homeUsageToDisplay = homeUsageState != 0 || this._config.display_zero_state ? this.displayValue(homeUsageState) : "";
    }

    let lowCarbonPercentage: number = 0;
    let lowCarbonEnergy: number = 0;

    if (this._energyData && this._energyData.co2SignalEntity && this._energyData.fossilEnergyConsumption) {
      // Calculate high carbon consumption
      const highCarbonEnergy: number = Object.values(this._energyData.fossilEnergyConsumption).reduce((sum, a) => sum + a, 0) * 1000;
      lowCarbonEnergy = gridFromGrid - highCarbonEnergy;

      // TODO: what the hell?!
      const highCarbonConsumption = highCarbonEnergy * (gridFromGrid / gridFromGrid);

      homeGridCircumference = CIRCLE_CIRCUMFERENCE * (highCarbonConsumption / totalHomeConsumption);
      homeFossilCircumference = CIRCLE_CIRCUMFERENCE - homeSolarCircumference - homeBatteryCircumference - homeGridCircumference;
      lowCarbonPercentage = (lowCarbonEnergy / gridFromGrid) * 100;
    }

    if (this._config.display_mode === DisplayMode.Live) {
      lowCarbonPercentage = 100 - getEntityState(this.hass, entities.fossil_fuel_percentage?.entity);
      lowCarbonEnergy = (lowCarbonPercentage * gridFromGrid) / 100;
    }

    // TODO: check why *1000
    lowCarbonEnergy = clampStateValue(lowCarbonEnergy, ((entities.fossil_fuel_percentage?.display_zero_tolerance ?? 0) * 1000 || 0));

    // Adjust Curved Lines
    const isCardWideEnough = this._width > 420;

    if (solar.isPresent) {
      if (battery.isPresent) {
        // has solar, battery and grid
        this.style.setProperty("--lines-svg-not-flat-line-height", isCardWideEnough ? "106%" : "102%");
        this.style.setProperty("--lines-svg-not-flat-line-top", isCardWideEnough ? "-3%" : "-1%");
        this.style.setProperty("--lines-svg-flat-width", isCardWideEnough ? "calc(100% - 160px)" : "calc(100% - 160px)");
      } else {
        // has solar but no battery
        this.style.setProperty("--lines-svg-not-flat-line-height", isCardWideEnough ? "104%" : "102%");
        this.style.setProperty("--lines-svg-not-flat-line-top", isCardWideEnough ? "-2%" : "-1%");
        this.style.setProperty("--lines-svg-flat-width", isCardWideEnough ? "calc(100% - 154px)" : "calc(100% - 157px)");
        this.style.setProperty("--lines-svg-not-flat-width", isCardWideEnough ? "calc(103% - 172px)" : "calc(103% - 169px)");
      }
    }

    //    const lowCarbonValue = this.displayValue(, entities.fossil_fuel_percentage?.state_type === "percentage" ? "%" : undefined, entities.fossil_fuel_percentage?.decimals);

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content" id="energy-flow-card-plus">

        <!-- top row -->
        ${fossilFuel.isPresent || solar.isPresent || individual1.isPresent
        ? html`
          <div class="row">

            <!-- top left -->
            ${!fossilFuel.isPresent || (lowCarbonEnergy == 0 && !entities.fossil_fuel_percentage?.display_zero)
            ? html`<div class="spacer"></div>`
            : html`${this.renderIndividualCircleAtTop(EntityType.LowCarbon, fossilFuel, entities.fossil_fuel_percentage?.state_type === "percentage" ? lowCarbonPercentage : lowCarbonEnergy, -newDur.lowCarbon)}`}

            <!-- top middle -->
            ${solar.isPresent
            ? html`${this.renderSolarCircle(solarTotal)}`
            : individual1.isPresent
              ? html`<div class="spacer"></div>`
              : ""}

            <!-- top right -->
            ${individual1.isPresent
            ? html`${this.renderIndividualCircleAtTop(EntityType.Individual1, individual1, individual1.state, newDur.individual1 * (entities?.individual1?.inverted_animation ? -1 : 1))}`
            : html`<div class="spacer"></div>`}

        </div>
        `
        : ""}

        <!-- middle row -->
        <div class="row">

          <!-- middle left -->
          ${this.renderGridCircle(gridToGrid, gridFromGrid)}

          <!-- middle right -->
          ${this.renderHomeCircle(
          homeSolarCircumference,
          homeBatteryCircumference,
          homeFossilCircumference,
          homeGridCircumference,
          homeConsumptionError,
          homeValueIsZero,
          homeUsageToDisplay)}

        </div>

        <!-- bottom row -->
        ${battery.isPresent || individual2.isPresent
        ? html`
          <div class="row">

            <!-- bottom left -->
            <div class="spacer"></div>

            <!-- bottom middle -->
            ${battery.isPresent
            ? html`${this.renderBatteryCircle(batteryToBattery, batteryFromBattery)}`
            : html`<div class="spacer"></div>`}

            <!-- bottom right -->
            ${individual2.isPresent
            ? html`${this.renderIndividualCircleAtBottom(EntityType.Individual2, individual2, individual2.state, newDur.individual2 * (entities?.individual2?.inverted_animation ? -1 : 1))}`
            : html`<div class="spacer"></div>`}

          </div>
        `
        : html`<div class="spacer"></div>`}

        <!-- connecting lines -->
        ${this.renderSolarToHomeLine(solarToHome, newDur.solarToHome)}
        ${this.renderSolarToGridLine(solarToGrid, newDur.solarToGrid)}
        ${this.renderSolarToBatteryLine(solarToBattery, newDur.solarToBattery)}
        ${this.renderGridToHomeLine(gridToHome, newDur.gridToHome)}
        ${this.renderBatteryToHomeLine(batteryToHome, newDur.batteryToHome)}
        ${this.renderBatteryGridLine(batteryToGrid, gridToBattery, newDur.batteryToGrid, newDur.gridToBattery)}

      </div>

      <!-- dashboard link -->
      ${this._config.dashboard_link
        ? html`
          <div class="card-actions">
            <a href=${this._config.dashboard_link}>
              <mwc-button>
                ${this._config.dashboard_link_label || this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard")}
              </mwc-button>
            </a>
          </div>
        `
        : ""}
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this._config || !this.hass) {
      return;
    }

    const elem = this?.shadowRoot?.querySelector("#energy-flow-card-plus");
    const widthStr = elem ? getComputedStyle(elem).getPropertyValue("width") : "0px";
    this._width = parseInt(widthStr.replace("px", ""), 10);
  }

  private initEntities = (config: EnergyFlowCardPlusConfig): void => {
    const entities = config.entities;
    this._grid = new GridEntity(this.hass, entities.grid);
    this._solar = new SolarEntity(this.hass, entities.solar);
    this._battery = new BatteryEntity(this.hass, entities.battery);
    this._home = new HomeEntity(this.hass, entities.home);
    this._individual1 = new IndividualEntity(this.hass, entities.individual1, EntityType.Individual1, localize("card.label.car"), "mdi:car-electric");
    this._individual2 = new IndividualEntity(this.hass, entities.individual2, EntityType.Individual2, localize("card.label.motorbike"), "mdi:motorbike-electric");
    this._fossilFuel = new FossilFuelEntity(this.hass, entities.fossil_fuel_percentage);
  };

  private populateEntitiesArr = (): void => {
    this._entitiesArr = [];

    Object.keys(this._config?.entities).forEach((entity) => {
      if (typeof this._config.entities[entity].entity === "string" || Array.isArray(this._config.entities[entity].entity)) {
        if (Array.isArray(this._config.entities[entity].entity)) {
          this._config.entities[entity].entity.forEach((entityId: string) => this._entitiesArr.push(entityId));
        } else {
          this._entitiesArr.push(this._config.entities[entity].entity);
        }
      } else if (typeof this._config.entities[entity].entity === "object") {
        if (Array.isArray(this._config.entities[entity].entity?.consumption)) {
          this._config.entities[entity].entity?.consumption.forEach((entityId: string) => this._entitiesArr.push(entityId));
        } else {
          this._entitiesArr.push(this._config.entities[entity].entity?.consumption);
        }

        if (Array.isArray(this._config.entities[entity].entity?.production)) {
          this._config.entities[entity].entity?.production.forEach((entityId: string) => this._entitiesArr.push(entityId));
        } else {
          this._entitiesArr.push(this._config.entities[entity].entity?.production);
        }
      }

      if (this._config.entities[entity].secondary_info?.entity) {
        this._entitiesArr.push(this._config.entities[entity].secondary_info?.entity);
      }
    });

    this._entitiesArr = this._entitiesArr.filter((entity) => entity);
  };

  private entityInverted = (entityType: EntityType) => !!this._config.entities[entityType]?.invert_state;

  private getEntityStateWattHours = (entity: BasicEntity | undefined): number => getEntityStateWattHours(this.hass, this._statistics, entity);

  private circleRate = (value: number, total: number): number => {
    const maxRate = this._config.max_flow_rate!;
    const minRate = this._config.min_flow_rate!;

    if (this._config.use_new_flow_rate_model) {
      const maxEnergy = this._config.max_expected_energy!;
      const minEnergy = this._config.min_expected_energy!;
      return mapRange(value, maxRate, minRate, minEnergy, maxEnergy);
    }

    return maxRate - (value / total) * (maxRate - minRate);
  };

  /**
   * Return a string to display with value and unit.
   * @param value - value to display (if text, will be returned as is)
   * @param unit - unit to display (default is dynamic)
   * @param decimals - number of decimals to display (default is user defined)
   */
  private displayValue = (value: number | string | null, unit?: string | undefined, decimals?: number | undefined): string => {
    if (value === null) {
      return "0";
    }

    if (Number.isNaN(value)) {
      return value.toString();
    }

    const valueAsNumber = new Decimal(value);
    // TODO: this is wrong, we can't apply this unless a unit is supplied
    const isMWh = (!unit || unit.toUpperCase().startsWith("MWH")) && valueAsNumber.abs().dividedBy(1000).greaterThanOrEqualTo(new Decimal(this._config.kwh_mwh_threshold!));
    const isKWh = (!unit || unit.toUpperCase().startsWith("KWH")) && valueAsNumber.abs().greaterThanOrEqualTo(new Decimal(this._config.wh_kwh_threshold!));
    const formattedValue = formatNumber(
      isMWh
        ? valueAsNumber.dividedBy(1000000).toDecimalPlaces(decimals ?? this._config.mwh_decimals).toString()
        : isKWh
          ? valueAsNumber.dividedBy(1000).toDecimalPlaces(decimals ?? this._config.kwh_decimals).toString()
          : valueAsNumber.toDecimalPlaces(decimals ?? this._config.wh_decimals).toString(),
      this.hass.locale
    );

    return `${formattedValue}${this._config.unit_white_space ? " " : ""}${unit ?? (isMWh ? "MWh" : isKWh ? "kWh" : "Wh")}`;
  };

  private openDetails = (event: { stopPropagation: any; key?: string }, entityId?: string | undefined): void => {
    event.stopPropagation();

    if (!entityId || !this._config.clickable_entities) {
      return;
    }

    // also needs to open details if entity is unavailable, but not if entity doesn't exist in hass states
    if (!entityExists(this.hass, entityId)) {
      return;
    }

    const e = new CustomEvent("hass-more-info", {
      composed: true,
      detail: { entityId },
    });

    this.dispatchEvent(e);
  };

  /**
   * Depending on if the user has decided to show inactive lines, decide if this line should be shown.
   * @param energy - energy value to check
   * @returns boolean to decide if line should be shown (true = show, false = don't show)
   */
  private showLine = (energy: number): boolean => this._config?.display_zero_lines || energy > 0;

  /**
   * Convert a an array of values in the format [r, g, b] to a hex color.
   * @param colorList - array of values in the format [r, g, b]
   * @returns hex color
   * @example
   * convertColorListToHex([255, 255, 255]) // returns #ffffff
   * convertColorListToHex([0, 0, 0]) // returns #000000
   */
  private convertColorListToHex = (colorList: number[]): string => "#".concat(colorList.map((x) => x.toString(16).padStart(2, "0")).join(""));

  private getSecondaryState = (entity: SecondaryInfoEntity, type: EntityType): string | number | null => {
    if (entity.isPresent) {
      const secondaryEntity = entity?.entity;
      const secondaryState = this.getEntityStateWattHours(secondaryEntity);

      if (typeof secondaryState === "number") {
        return secondaryState;
      }

      if (typeof secondaryState === "string") {
        return secondaryState;
      }
    }

    return null;
  };

  private renderSecondarySpan = (entity: SecondaryInfoEntity, type: EntityType): TemplateResult => {
    if (!entity.isPresent && !entity.template) {
      return html``;
    }

    let state: string | number | null = this.getSecondaryState(entity, type);

    state = isNumberValue(state) && Math.abs(coerceNumber(state)) < (entity.displayZeroTolerance ?? 0)
      ? 0
      : state;

    if (entity.displayZero || state) {
      return html`
        <span class="secondary-info ${type}" @click=${this.handleClick(entity.entity)} @keyDown=${(this.handleKeyDown(entity.entity))}>
          ${entity.icon ? html`<ha-icon class="secondary-info small" .icon=${entity.icon}></ha-icon>` : ""}
          ${entity.template ?? this.displayValue(state, entity.unit, entity.decimals)}
        </span>
      `;
    }

    return html``;
  };

  private renderHomeCircle = (
    homeSolarCircumference: number,
    homeBatteryCircumference: number,
    homeFossilCircumference: number | undefined,
    homeGridCircumference: number | undefined,
    homeConsumptionError: boolean,
    homeValueIsZero: boolean,
    homeUsageToDisplay: string
  ): TemplateResult => {
    const home: HomeEntity = this._home;

    return html`
      <div class="circle-container home">
        <div class="circle" id = "home-circle" @click=${this.handleClick(home.mainEntity)} @keyDown=${this.handleKeyDown(home.mainEntity)}>
          <svg class="home-circle-sections">
            ${homeSolarCircumference
        ? svg`
            <circle
              class="solar"
              cx="40"
              cy="40"
              r="38"
              stroke-dasharray="${homeSolarCircumference} ${CIRCLE_CIRCUMFERENCE - homeSolarCircumference}"
              shape-rendering="geometricPrecision"
              stroke-dashoffset="-${CIRCLE_CIRCUMFERENCE - homeSolarCircumference}"
            />
            `
        : ""}

          ${homeBatteryCircumference
        ? svg`
            <circle
              class="battery"
              cx="40"
              cy="40"
              r="38"
              stroke-dasharray="${homeBatteryCircumference} ${CIRCLE_CIRCUMFERENCE - homeBatteryCircumference}"
              stroke-dashoffset="-${CIRCLE_CIRCUMFERENCE - homeBatteryCircumference - homeSolarCircumference}"
              shape-rendering="geometricPrecision"
            />
            `
        : ""}

          ${homeFossilCircumference
        ? svg`
            <circle
              class="low-carbon"
              cx="40"
              cy="40"
              r="38"
              stroke-dasharray="${homeFossilCircumference} ${CIRCLE_CIRCUMFERENCE - homeFossilCircumference}"
              stroke-dashoffset="-${CIRCLE_CIRCUMFERENCE - homeFossilCircumference - homeBatteryCircumference - homeSolarCircumference}"
              shape-rendering="geometricPrecision"
            />
            `
        : ""}

            <circle
              class="${homeConsumptionError || homeValueIsZero ? `home-unknown` : `grid`}"
              cx = "40"
              cy = "40"
              r = "38"
              stroke-dasharray="${homeGridCircumference ?? CIRCLE_CIRCUMFERENCE - homeSolarCircumference - homeBatteryCircumference} ${homeGridCircumference ? CIRCLE_CIRCUMFERENCE - homeGridCircumference : homeSolarCircumference + homeBatteryCircumference}"
              stroke-dashoffset="0"
              shape-rendering="geometricPrecision"
            />
          </svg>
          ${this.renderSecondarySpan(home.secondary, EntityType.HomeSecondary)}
          <ha-icon class="entity-icon" .icon=${home.icon}></ha-icon>
          ${homeUsageToDisplay}
        </div>

        ${this._individual2.isPresent ? "" : html`<span class="label">${home.name}</span>`}
      </div>
    `;
  };

  private renderGridCircle = (gridToGrid: number, gridFromGrid: number): TemplateResult => {
    const gridIcon: string =
      this._grid.powerOutage.isOutage
        ? this._config.entities?.grid?.power_outage?.icon_alert ?? "mdi:transmission-tower-off"
        : this._grid.icon;

    const productionEntity: string = Array.isArray(this._grid.entity?.production) ? this._grid.entity?.production[0] : this._grid.entity?.production;

    return html`
      ${this._grid.isPresent
        ? html`
        <div class="circle-container grid">
          <div class="circle" @click=${this.handleClick(this._grid.mainEntity)} @keyDown=${this.handleKeyDown(this._grid.mainEntity)}>
          ${this.renderSecondarySpan(this._grid.secondary, EntityType.Grid_Secondary)}
          <ha-icon class="entity-icon" .icon=${gridIcon}></ha-icon>
          ${!this._grid.powerOutage.isOutage && (this._config.display_zero_state || gridToGrid != 0)
            ? html`
            <span class="return" @click=${this.handleClick(productionEntity)} @keyDown=${this.handleKeyDown(productionEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-left"}></ha-icon>
              ${this.displayValue(gridToGrid)}
            </span>
            `
            : null}
            ${!this._grid.powerOutage.isOutage && (this._config.display_zero_state || gridFromGrid != 0)
            ? html`
            <span class="consumption">
              <ha-icon class="small" .icon=${"mdi:arrow-right"}></ha-icon>
              ${this.displayValue(gridFromGrid)}
            </span>`
            : ""}
            ${this._grid.powerOutage.isOutage
            ? html`
            <span style="padding-top: 2px;" class="grid power-outage">${this._config.entities.grid?.power_outage?.label_alert || html`Power<br/>Outage`}</span>`
            : ""}
          </div>
          <span class="label">${this._grid.name}</span>
        </div>
        `
        : html`
        <div class="spacer"></div>
        `
      }
    `;
  };

  private renderSolarCircle = (solarTotal: number): TemplateResult => {
    return html`
      <div class="circle-container solar">
        <span class="label">${this._solar.name}</span>
        <div class="circle" @click=${this.handleClick(this._solar.mainEntity)} @keyDown=${this.handleKeyDown(this._solar.mainEntity)}}>
          ${this.renderSecondarySpan(this._solar.secondary, EntityType.Solar_Secondary)}
          <ha-icon class="entity-icon" id="solar-icon" .icon=${this._solar.icon}></ha-icon>
          ${this._config.display_zero_state || solarTotal != 0 ? html`<span class="solar">${this.displayValue(solarTotal)}</span>` : ""}
        </div>
      </div>
    `;
  };

  private renderBatteryCircle = (batteryToBattery: number, batteryFromBattery: number): TemplateResult => {
    const battery = this._config.entities.battery;
    const batteryChargeState = battery?.state_of_charge ? getEntityState(this.hass, battery?.state_of_charge) : null;

    let batteryIcon = "mdi:battery-high";

    if (battery?.icon) {
      batteryIcon = battery?.icon;
    } else {
      if (!batteryChargeState) {
        batteryIcon = "mdi:battery-high";
      } else if (batteryChargeState <= 72 && batteryChargeState > 44) {
        batteryIcon = "mdi:battery-medium";
      } else if (batteryChargeState <= 44 && batteryChargeState > 16) {
        batteryIcon = "mdi:battery-low";
      } else if (batteryChargeState <= 16) {
        batteryIcon = "mdi:battery-outline";
      }
    }

    return html`
      <div class="circle-container battery">
        <div class="circle" @click=${this.handleClick(battery?.state_of_charge || battery?.entity?.production)} @keyDown=${this.handleKeyDown(battery?.state_of_charge || battery?.entity?.production)}>
          ${batteryChargeState
        ? html`
          <span @click=${this.handleClick(battery?.state_of_charge)} @keyDown=${this.handleKeyDown(battery?.state_of_charge)} id="battery-state-of-charge-text">
            ${this.displayValue(batteryChargeState, battery?.state_of_charge_unit || "%", battery?.state_of_charge_decimals || 0)}
          </span>
          `
        : ""}

          <ha-icon class="entity-icon" .icon=${batteryIcon} @click=${this.handleClick(battery?.state_of_charge)} @keyDown=${this.handleKeyDown(battery?.state_of_charge)}></ha-icon>
          ${this._config.display_zero_state || batteryToBattery != 0
        ? html`
            <span class="battery-in" style="padding-top: 2px;" @click=${this.handleClick(battery?.entity?.production)} @keyDown=${this.handleKeyDown(battery?.entity?.production)}>
              <ha-icon class="small" .icon=${"mdi:arrow-down"}></ha-icon>
              ${this.displayValue(batteryToBattery)}
            </span>
            `
        : ""}

          ${this._config.display_zero_state || batteryFromBattery != 0
        ? html`
            <span class="battery-out" style="padding-top: 2px;" @click=${this.handleClick(battery?.entity?.consumption)} @keyDown=${this.handleKeyDown(battery?.entity?.consumption)}>
              <ha-icon class="small" .icon=${"mdi:arrow-up"}></ha-icon>
              ${this.displayValue(batteryFromBattery)}
            </span>
            `
        : ""}
        </div>
        <span class="label">${this._battery.name}</span>
      </div>
    `;
  };

  private renderIndividualCircleAtTop = (type: EntityType, entity: Entity, state: number, animDuration: number): TemplateResult => {
    return html`
      <div class="circle-container ${type}">
        <span class="label">${entity.name}</span>
        <div class="circle" @click=${this.handleClick(entity.mainEntity)} @keyDown=${this.handleKeyDown(entity.mainEntity)}>
          ${this.renderSecondarySpan(entity.secondary, type)}
          <ha-icon class="${type} entity-icon" .icon=${entity.icon}></ha-icon>
          ${this._config.display_zero_state || state != 0 ? html`<span class=" ${type}">${this.displayValue(state)}</span>` : ""}
        </div>
        ${this.showLine(state)
        ? html`
          <svg width="80" height="30">
            ${this.renderLine(type, "M40 30 V-30")}
            ${state != 0 ? html`${this.renderDot(DOT_SIZE_INDIVIDUAL, type, Math.abs(animDuration), animDuration < 0)}` : ""}
          </svg>
        `
        : ""}
      </div>
    `;
  };

  private renderIndividualCircleAtBottom = (type: EntityType, entity: IndividualEntity, state: number, animDuration: number): TemplateResult => {
    return html`
      <div class="circle-container ${type}">
        ${this.showLine(state)
        ? html`
          <svg width="80" height="30">
            ${this.renderLine(type, "M40 0 V30")}
            ${state != 0 ? html`${this.renderDot(DOT_SIZE_INDIVIDUAL, type, Math.abs(animDuration), animDuration < 0)}` : ""}
          </svg>
        `
        : ""}
        <div class="circle" @click=${this.handleClick(entity.mainEntity)} @keyDown=${this.handleKeyDown(entity.mainEntity)}>
          ${this.renderSecondarySpan(entity.secondary, type)}
          <ha-icon  class="entity-icon" .icon=${entity.icon}></ha-icon>
          ${this._config.display_zero_state || state != 0 ? html`<span class=" ${type}">${this.displayValue(state)}</span>` : ""}
        </div>
        <span class="label">${entity.name}</span>
      </div>
    `;
  };

  private renderSolarToHomeLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M${this._battery.isPresent ? 55 : 53},0 v${this._grid.isPresent ? 15 : 17} c0,${this._battery.isPresent ? "30 10,30 30,30" : "35 10,35 30,35"} h25`;

    return html`
      ${this._solar.isPresent && this.showLine(value ?? 0)
        ? html`
        <div class=${this.getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-home-flow">
            ${this.renderLine("solar", path)}
            ${value != 0 ? html`${this.renderDot(DOT_SIZE_STANDARD, "solar", animDuration)}` : ""}
          </svg>
        </div>
        `
        : ""
      }
    `;
  };

  private renderSolarToGridLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M${this._battery.isPresent ? 45 : 47},0 v15 c0,${this._battery.isPresent ? "30 -10,30 -30,30" : "35 -10,35 -30,35"} h-20`;

    return html`
      ${this._grid.hasReturnToGrid && this._solar.isPresent && this.showLine(value ?? 0)
        ? html`
        <div class=${this.getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-grid-flow">
            ${this.renderLine("return", path)}
            ${value != 0 ? html`${this.renderDot(DOT_SIZE_STANDARD, "return", animDuration)}` : ""}
          </svg>
        </div>
        `
        : ""}
    `;
  };

  private renderSolarToBatteryLine = (value: number, animDuration: number): TemplateResult => {
    return html`
      ${this._battery.isPresent && this._solar.isPresent && this.showLine(value ?? 0)
        ? html`
        <div class=${this.getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-battery-flow" class="flat-line">
            ${this.renderLine("battery-solar", "M50,0 V100")}
            ${value != 0 ? html`${this.renderDot(DOT_SIZE_STANDARD, "battery-solar", animDuration)}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private renderGridToHomeLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M0,${this._battery.isPresent ? 50 : this._solar.isPresent ? 56 : 53} H100`;

    return html`
      ${this._grid.isPresent && this.showLine(value)
        ? html`
        <div class=${this.getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="grid-home-flow" class="flat-line">
            ${this.renderLine("grid", path)}
            ${value != 0 ? html`${this.renderDot(DOT_SIZE_STANDARD, "grid", animDuration)}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private renderBatteryToHomeLine = (batteryToHome: number, animDuration: number): TemplateResult => {
    const path: string = `M55,100 v-${this._grid.isPresent ? 15 : 17} c0,-30 10,-30 30,-30 h20`;

    return html`
      ${this._battery.isPresent && this.showLine(batteryToHome)
        ? html`
        <div class=${this.getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="battery-home-flow">
            ${this.renderLine("battery-home", path)}
            ${batteryToHome != 0 ? html`${this.renderDot(DOT_SIZE_STANDARD, "battery-home", animDuration)}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private renderBatteryGridLine = (batteryToGrid: number, gridToBattery: number, animDurationBatteryToGrid: number, animDurationGridToBattery: number): TemplateResult => {
    const cssClass: string = (gridToBattery) ? "battery-from-grid " : "" + batteryToGrid ? "battery-to-grid" : "";

    return html`
      ${this._grid.isPresent && this._battery.isPresent && this.showLine(Math.max(gridToBattery, batteryToGrid))
        ? html`
        <div class=${this.getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="battery-grid-flow">
            ${this.renderLine("battery-grid", "M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20", cssClass)}
            ${gridToBattery != 0 ? html`${this.renderDot(DOT_SIZE_STANDARD, "battery-from-grid", animDurationGridToBattery, true, "battery-grid")}` : ""}
            ${batteryToGrid != 0 ? html`${this.renderDot(DOT_SIZE_STANDARD, "battery-to-grid", animDurationBatteryToGrid, false, "battery-grid")}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private getLineCssClasses = (): string => {
    return "lines" +
      (this._battery.isPresent
        ? " high"
        : this._individual1.isPresent && this._individual2.isPresent
          ? " individual1-individual2"
          : "");
  };

  private renderLine = (id: string, path: string, cssClass: string | undefined = undefined): TemplateResult => {
    return svg`
      <path id="${id}" class="${cssClass || id}" d="${path}" vector-effect="non-scaling-stroke"/>
      `;
  };

  private renderDot = (size: number, cssClass: string, duration: number, reverseDirection: boolean = false, pathRef: string | undefined = undefined): TemplateResult => {
    return svg`
      <circle r="${size}" class="${cssClass}" vector-effect="non-scaling-stroke">
        <animateMotion dur="${duration}s" repeatCount="indefinite" keyPoints="${reverseDirection ? "1; 0" : "0; 1"}" keyTimes="0; 1" calcMode="linear">
          <mpath xlink: href = "#${pathRef ?? cssClass}"/>
        </animateMotion>
      </circle>
      `;
  };

  private handleKeyDown = (target: string | undefined) => {
    if (!target) {
      return undefined;
    }

    return (e: { key: string; stopPropagation: () => void }) => {
      if (e.key === "Enter") {
        e.stopPropagation();
        this.openDetails(e, target);
      }
    };

  };

  private handleClick = (target: string | undefined) => {
    if (!target) {
      return undefined;
    }

    return (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      this.openDetails(e, target);
    };
  };

}
