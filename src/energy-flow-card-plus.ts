/* eslint-disable @typescript-eslint/no-explicit-any */
import { html, LitElement, PropertyValues, svg, TemplateResult } from "lit";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { formatNumber, HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import { Decimal } from "decimal.js";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
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
import { coerceNumber, isNumberValue, mapRange } from "./utils";
import { registerCustomCard } from "./utils/register-custom-card";
import { Flows, calculateStatisticsFlows, getLiveDeltas } from "./flows";
import { entityExists, entityAvailable, getEntityStateObj, getEntityState, getEntityStateWattHours } from "./entities";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { differenceInDays, isFirstDayOfMonth, isLastDayOfMonth } from 'date-fns';
import { ColorMode, DisplayMode, EntityType } from "./enums";

registerCustomCard({
  type: "energy-flow-card-plus",
  name: "Energy Flow Card Plus",
  description: "A custom card for displaying energy flow in Home Assistant. Inspired by the official Energy Distribution Card.",
});

const energyDataTimeout = 10000;
const circleCircumference = 238.76104;

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
              periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
            } else {
              periodStart = data.start;
              periodEnd = data.end ?? new Date();
            }

            const dayDifference: number = differenceInDays(periodEnd, periodStart);
            const period = this._config.use_hourly_stats
              ? 'hour'
              : isFirstDayOfMonth(periodStart) && (!periodEnd || isLastDayOfMonth(periodEnd)) && dayDifference > 35
                ? 'month'
                : dayDifference > 2
                  ? 'day'
                  : 'hour';

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

    // Create initial objects for each field
    const grid = this._grid;
    const solar = this._solar;
    const battery = this._battery;

    const home = {
      entity: entities.home?.entity,
      mainEntity: Array.isArray(entities.home?.entity) ? entities.home?.entity[0] : entities.home?.entity,
      has: entities?.home?.entity,
      state: 0,
      icon: this.computeFieldIcon(entities?.home, "mdi:home"),
      name: this.computeFieldName(entities?.home, this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.home")),
      color: {
        icon_type: entities.home?.color_of_icon
      },
      secondary: {
        entity: entities.home?.secondary_info?.entity,
        template: entities.home?.secondary_info?.template,
        isPresent: this.hasField(entities.home?.secondary_info, true),
        state: null as number | string | null,
        unit: entities.home?.secondary_info?.unit_of_measurement,
        icon: entities.home?.secondary_info?.icon,
        decimals: entities.home?.secondary_info?.decimals,
        color_type: entities.home?.secondary_info?.color_of_value
      }
    };

    const getIndividualObject = (field: "individual1" | "individual2") => ({
      entity: entities[field]?.entity,
      mainEntity: Array.isArray(entities[field]?.entity) ? entities[field]?.entity[0] : (entities[field]?.entity as string | undefined),
      isPresent: this.hasField(entities[field]),
      displayZero: entities[field]?.display_zero,
      displayZeroTolerance: entities[field]?.display_zero_tolerance,
      state: 0,
      icon: this.computeFieldIcon(entities[field], field === "individual1" ? "mdi:car-electric" : "mdi:motorbike-electric"),
      name: this.computeFieldName(entities[field], field === "individual1" ? localize("card.label.car") : localize("card.label.motorbike")),
      color: entities[field]?.color,
      unit: entities[field]?.unit_of_measurement,
      decimals: entities[field]?.decimals,
      invertAnimation: entities[field]?.inverted_animation,
      showDirection: entities[field]?.show_direction,
      secondary: {
        entity: entities[field]?.secondary_info?.entity,
        template: entities[field]?.secondary_info?.template,
        isPresent: this.hasField(entities[field]?.secondary_info, true),
        state: null as number | string | null,
        icon: entities[field]?.secondary_info?.icon,
        unit: entities[field]?.secondary_info?.unit_of_measurement,
        displayZero: entities[field]?.secondary_info?.display_zero,
        decimals: entities[field]?.secondary_info?.decimals,
        displayZeroTolerance: entities[field]?.secondary_info?.display_zero_tolerance,
        color_type: entities[field]?.secondary_info?.color_of_value
      }
    });

    const individual1 = getIndividualObject("individual1");
    const individual2 = getIndividualObject("individual2");

    type Individual = typeof individual2 & typeof individual1;

    const nonFossil = {
      entity: entities.fossil_fuel_percentage?.entity,
      mainEntity: Array.isArray(entities.fossil_fuel_percentage?.entity)
        ? entities.fossil_fuel_percentage?.entity[0]
        : entities.fossil_fuel_percentage?.entity,
      name: entities.fossil_fuel_percentage?.name ?? (entities.fossil_fuel_percentage?.use_metadata && getEntityStateObj(this.hass, entities.fossil_fuel_percentage.entity)?.attributes.friendly_name) ?? this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.low_carbon"),
      icon: entities.fossil_fuel_percentage?.icon ?? (entities.fossil_fuel_percentage?.use_metadata && getEntityStateObj(this.hass, entities.fossil_fuel_percentage.entity)?.attributes?.icon) ?? "mdi:leaf",
      has: false,
      hasPercentage: false,
      state: {
        power: 0
      },
      color: entities.fossil_fuel_percentage?.color,
      color_value: entities.fossil_fuel_percentage?.color_value,
      secondary: {
        entity: entities.fossil_fuel_percentage?.secondary_info?.entity,
        template: entities.fossil_fuel_percentage?.secondary_info?.template,
        isPresent: this.hasField(entities.fossil_fuel_percentage?.secondary_info, true),
        state: null as number | string | null,
        icon: entities.fossil_fuel_percentage?.secondary_info?.icon,
        unit: entities.fossil_fuel_percentage?.secondary_info?.unit_of_measurement,
        color_value: entities.fossil_fuel_percentage?.secondary_info?.color_of_value
      }
    };

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

    // Update Icon of Grid depending on Power Outage and other user configurations (computeFieldIcon)
    grid.icon = !grid.powerOutage.isOutage
      ? this.computeFieldIcon(entities.grid, "mdi:transmission-tower")
      : entities?.grid?.power_outage?.icon_alert ?? "mdi:transmission-tower-off";

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

    individual1.secondary.state = this.getSecondaryState(individual1.secondary, EntityType.Individual1_Secondary);
    individual2.secondary.state = this.getSecondaryState(individual2.secondary, EntityType.Individual2_Secondary);
    solar.secondary.state = this.getSecondaryState(solar.secondary, EntityType.Solar_Secondary);
    home.secondary.state = this.getSecondaryState(home.secondary, EntityType.HomeSecondary);
    nonFossil.secondary.state = this.getSecondaryState(nonFossil.secondary, EntityType.Non_Fossil_Secondary);
    grid.secondary.state = this.getSecondaryState(grid.secondary, EntityType.Grid_Secondary);

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
      homeBatteryCircumference = circleCircumference * (batteryToHome / totalHomeConsumption);
    }

    let homeSolarCircumference: number = 0;

    if (solar.isPresent) {
      homeSolarCircumference = circleCircumference * (solarToHome / totalHomeConsumption);
    }

    let homeGridCircumference: number | undefined;
    let lowCarbonEnergy: number | undefined;
    let nonFossilFuelEnergy: number | undefined;
    let homeNonFossilCircumference: number | undefined;

    const totalLines = solarToHome + solarToGrid + solarToBattery + gridToHome + gridToBattery + batteryToHome + batteryToGrid;

    const batteryChargeState = entities?.battery?.state_of_charge ? getEntityState(this.hass, entities.battery?.state_of_charge) : null;

    let batteryIcon = "mdi:battery-high";

    if (!batteryChargeState) {
      batteryIcon = "mdi:battery-high";
    } else if (batteryChargeState <= 72 && batteryChargeState > 44) {
      batteryIcon = "mdi:battery-medium";
    } else if (batteryChargeState <= 44 && batteryChargeState > 16) {
      batteryIcon = "mdi:battery-low";
    } else if (batteryChargeState <= 16) {
      batteryIcon = "mdi:battery-outline";
    }

    if (entities.battery?.icon !== undefined) {
      batteryIcon = entities.battery?.icon;
    }

    const newDur = {
      batteryGrid: this.circleRate(gridToBattery ?? batteryToGrid ?? 0, totalLines),
      batteryToHome: this.circleRate(batteryToHome ?? 0, totalLines),
      gridToHome: this.circleRate(gridToHome, totalLines),
      solarToBattery: this.circleRate(solarToBattery ?? 0, totalLines),
      solarToGrid: this.circleRate(solarToGrid ?? 0, totalLines),
      solarToHome: this.circleRate(solarToHome ?? 0, totalLines),
      individual1: this.circleRate(individual1.state ?? 0, totalIndividualConsumption),
      individual2: this.circleRate(individual2.state ?? 0, totalIndividualConsumption),
      nonFossil: this.circleRate(nonFossilFuelEnergy ?? 0, totalLines),
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
        value: nonFossilFuelEnergy ?? 0,
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

    const solarIcon = entities.solar?.icon || (entities.solar?.use_metadata && getEntityStateObj(this.hass, solar.mainEntity)?.attributes?.icon) || "mdi:solar-power";
    const solarName = entities.solar?.name || (entities.solar?.use_metadata && getEntityStateObj(this.hass, solar.mainEntity)?.attributes.friendly_name) || this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.solar");
    const homeIcon = entities.home?.icon || (entities.home?.use_metadata && getEntityStateObj(this.hass, home.mainEntity)?.attributes?.icon) || "mdi:home";
    const homeName = entities.home?.name || (entities.home?.use_metadata && getEntityStateObj(this.hass, home.mainEntity)?.attributes.friendly_name) || this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.home");
    const nonFossilIcon = entities.fossil_fuel_percentage?.icon || (entities.fossil_fuel_percentage?.use_metadata && getEntityStateObj(this.hass, entities.fossil_fuel_percentage.entity)?.attributes?.icon) || "mdi:leaf";
    const nonFossilName = entities.fossil_fuel_percentage?.name || (entities.fossil_fuel_percentage?.use_metadata && getEntityStateObj(this.hass, entities.fossil_fuel_percentage.entity)?.attributes.friendly_name) || this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.low_carbon");

    const individual1DisplayState = this.displayValue(
      individual1.state,
      entities.individual1?.unit_of_measurement,
      entities.individual1?.decimals
    );

    const individual2DisplayState = this.displayValue(
      individual2.state,
      entities.individual2?.unit_of_measurement,
      entities.individual2?.decimals
    );

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

      homeUsageToDisplay = homeUsageState > 0 || entities.home?.display_zero_state ? this.displayValue(homeUsageState) : "";
    }

    let lowCarbonPercentage: number | undefined;

    if (this._energyData && this._energyData.co2SignalEntity && this._energyData.fossilEnergyConsumption) {
      // Calculate high carbon consumption
      const highCarbonEnergy = Object.values(this._energyData.fossilEnergyConsumption).reduce((sum, a) => sum + a, 0) * 1000;

      if (highCarbonEnergy !== null) {
        lowCarbonEnergy = gridFromGrid - highCarbonEnergy;
      }

      // TODO: what the hell?!
      const highCarbonConsumption = highCarbonEnergy * (gridFromGrid / gridFromGrid);

      homeGridCircumference = circleCircumference * (highCarbonConsumption / totalHomeConsumption);
      homeNonFossilCircumference = circleCircumference - (homeSolarCircumference || 0) - (homeBatteryCircumference || 0) - homeGridCircumference;
      lowCarbonPercentage = ((lowCarbonEnergy || 0) / gridFromGrid) * 100;
    }

    const hasNonFossilFuelUsage = lowCarbonEnergy !== null && lowCarbonEnergy && lowCarbonEnergy > ((entities.fossil_fuel_percentage?.display_zero_tolerance ?? 0) * 1000 || 0);
    const hasFossilFuelPercentage = entities.fossil_fuel_percentage?.show === true;

    if (this._config.display_mode === DisplayMode.Live) {
      lowCarbonPercentage = 100 - getEntityState(this.hass, entities.fossil_fuel_percentage?.entity);
      lowCarbonEnergy = (lowCarbonPercentage * gridFromGrid) / 100;
    }

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

    const baseSecondarySpan = ({
      className,
      template,
      value,
      entityId,
      icon,
    }: {
      className: string;
      template?: string;
      value?: string;
      entityId?: string;
      icon?: string;
    }) => {
      if (value || template) {
        return html`<span
          class="secondary-info ${className}"
          @click=${(e: { stopPropagation: () => void }) => {
            this.openDetails(e, entityId);
          }}
          @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
            if (e.key === "Enter") {
              this.openDetails(e, entityId);
            }
          }}
        >
          ${entities.solar?.secondary_info?.icon ? html`<ha-icon class="secondary-info small" .icon=${icon}></ha-icon>` : ""}
          ${template ?? value}</span
        >`;
      }
      return "";
    };

    const generalSecondarySpan = (field, key: string) => {
      return html` ${field.secondary.has || field.secondary.template
        ? html` ${baseSecondarySpan({
            className: key,
            entityId: field.secondary.entity,
            icon: field.secondary.icon,
            value: this.displayValue(field.secondary.state, field.secondary.unit, field?.secondary?.decimals),
          })}`
        : ""}`;
    };

    const individualSecondarySpan = (individual: Individual, key: string) => {
      const value = individual.secondary.isPresent
        ? this.displayValue(individual.secondary.state, individual.secondary.unit)
        : undefined;
      const passesDisplayZeroCheck =
        individual.secondary.displayZero !== false ||
        (isNumberValue(individual.secondary.state)
          ? (Number(individual.secondary.state) ?? 0) > (individual.secondary.displayZeroTolerance ?? 0)
          : true);
      return html` ${individual.secondary.isPresent && passesDisplayZeroCheck
        ? html`${baseSecondarySpan({
            className: key,
            entityId: individual.secondary.entity,
            icon: individual.secondary.icon,
            value,
          })}`
        : ""}`;
    };

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content" id="energy-flow-card-plus">
          ${solar.isPresent || individual2.isPresent || individual1.isPresent || hasFossilFuelPercentage
            ? html`<div class="row">
                ${!hasFossilFuelPercentage || (!hasNonFossilFuelUsage && entities.fossil_fuel_percentage?.display_zero === false)
                  ? html`<div class="spacer"></div>`
                  : html`<div class="circle-container low-carbon">
                      <span class="label">${nonFossilName}</span>
                      <div
                        class="circle"
                        @click=${(e: { stopPropagation: () => void }) => {
                          this.openDetails(e, entities.fossil_fuel_percentage?.entity);
                        }}
                        @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                          if (e.key === "Enter") {
                            this.openDetails(e, entities.fossil_fuel_percentage?.entity);
                          }
                        }}
                      >
                        ${generalSecondarySpan(nonFossil, "nonFossilFuel")}
                        <ha-icon
                          .icon=${nonFossilIcon}
                          class="low-carbon"
                          style="${nonFossil.secondary.isPresent ? "padding-top: 2px;" : "padding-top: 0px;"}
                          ${entities.fossil_fuel_percentage?.display_zero_state !== false ||
                          (nonFossilFuelEnergy || 0) > (entities.fossil_fuel_percentage?.display_zero_tolerance || 0)
                            ? "padding-bottom: 2px;"
                            : "padding-bottom: 0px;"}"
                        ></ha-icon>
                        ${entities.fossil_fuel_percentage?.display_zero_state !== false || hasNonFossilFuelUsage !== false
                          ? html`
                              <span class="low-carbon"
                                >${this.displayValue(
                                  entities.fossil_fuel_percentage?.state_type === "percentage" ? lowCarbonPercentage || 0 : lowCarbonEnergy || 0,
                                  entities.fossil_fuel_percentage?.state_type === "percentage" ? "%" : undefined,
                                  entities.fossil_fuel_percentage?.decimals
                                )}</span
                              >
                            `
                          : ""}
                      </div>
                      ${this.showLine(nonFossilFuelEnergy || 0)
                        ? html`
                            <svg width="80" height="30">
                              <path d="M40 -10 v40" class="low-carbon" id="low-carbon" />
                              ${hasNonFossilFuelUsage
                                ? svg`<circle
                              r="2.4"
                              class="low-carbon"
                              vector-effect="non-scaling-stroke"
                            >
                                <animateMotion
                                  dur="${this.additionalCircleRate(entities.fossil_fuel_percentage?.calculate_flow_rate, newDur.nonFossil) || 0}s"
                                  repeatCount="indefinite"
                                  calcMode="linear"
                                >
                                  <mpath xlink:href="#low-carbon" />
                                </animateMotion>
                            </circle>`
                                : ""}
                            </svg>
                          `
                        : ""}
                    </div>`}
                ${solar.isPresent
                  ? html`<div class="circle-container solar">
                      <span class="label">${solarName}</span>
                      <div
                        class="circle"
                        @click=${(e: { stopPropagation: () => void }) => {
                          this.openDetails(e, solar.mainEntity);
                        }}
                        @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                          if (e.key === "Enter") {
                            this.openDetails(e, solar.mainEntity);
                          }
                        }}
                      >
                        ${generalSecondarySpan(solar, "solar")}
                        <ha-icon
                          id="solar-icon"
                          .icon=${solarIcon}
                          style="${solar.secondary.isPresent ? "padding-top: 2px;" : "padding-top: 0px;"}
                          ${entities.solar?.display_zero_state !== false || (solarTotal || 0) > 0
                            ? "padding-bottom: 2px;"
                            : "padding-bottom: 0px;"}"
                        ></ha-icon>
                        ${entities.solar?.display_zero_state !== false || (solarTotal || 0) > 0
                          ? html` <span class="solar value"> ${this.displayValue(solarTotal)}</span>`
                          : ""}
                      </div>
                    </div>`
                  : individual2.isPresent || individual1.isPresent
                  ? html`<div class="spacer"></div>`
                  : ""}
                ${individual2.isPresent
                  ? html`<div class="circle-container individual2">
                      <span class="label">${individual2.name}</span>
                      <div
                        class="circle"
                        @click=${(e: { stopPropagation: () => void }) => {
                          this.openDetails(e, individual2.mainEntity);
                        }}
                        @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                          if (e.key === "Enter") {
                            this.openDetails(e, individual2.mainEntity);
                          }
                        }}
                      >
                        ${individualSecondarySpan(individual2, "individual2")}
                        <ha-icon
                          id="individual2-icon"
                          .icon=${individual2.icon}
                          style="${individual2.secondary.isPresent ? "padding-top: 2px;" : "padding-top: 0px;"}
                          ${entities.individual2?.display_zero_state || (individual2.state || 0) > 0
                            ? "padding-bottom: 2px;"
                            : "padding-bottom: 0px;"}"
                        ></ha-icon>
                        ${entities.individual2?.display_zero_state || (individual2.state || 0) > 0
                          ? html` <span class="individual2">${individual2DisplayState} </span>`
                          : ""}
                      </div>
                      ${this.showLine(individual2.state || 0)
                        ? html`
                            <svg width="80" height="30">
                              <path d="M40 -10 v50" id="individual2" />
                              ${individual2.state
                                ? svg`<circle
                              r="2.4"
                              class="individual2"
                              vector-effect="non-scaling-stroke"
                            >
                              <animateMotion
                                dur="${this.additionalCircleRate(entities.individual2?.calculate_flow_rate, newDur.individual2)}s"    
                                repeatCount="indefinite"
                                calcMode="linear"
                                keyPoints=${entities.individual2?.inverted_animation ? "0;1" : "1;0"}
                                keyTimes="0;1"
                              >
                                <mpath xlink:href="#individual2" />
                              </animateMotion>
                            </circle>`
                                : ""}
                            </svg>
                          `
                        : ""}
                    </div>`
                  : individual1.isPresent
                  ? html`<div class="circle-container individual1">
                      <span class="label">${individual1.name}</span>
                      <div
                        class="circle"
                        @click=${(e: { stopPropagation: () => void }) => {
                          e.stopPropagation();
                          this.openDetails(e, individual1.mainEntity);
                        }}
                        @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                          if (e.key === "Enter") {
                            this.openDetails(e, individual1.mainEntity);
                          }
                        }}
                      >
                        ${individualSecondarySpan(individual1, "individual1")}
                        <ha-icon
                          id="individual1-icon"
                          .icon=${individual1.icon}
                          style="${individual1.secondary.isPresent ? "padding-top: 2px;" : "padding-top: 0px;"}
                          ${entities.individual1?.display_zero_state || (individual1.state || 0) > 0
                            ? "padding-bottom: 2px;"
                            : "padding-bottom: 0px;"}"
                        ></ha-icon>
                        ${entities.individual1?.display_zero_state || (individual1.state || 0) > 0
                          ? html`<span class="individual1">${individual1DisplayState}</span>`
                          : ""}
                      </div>
                      ${this.showLine(individual1.state || 0)
                        ? html`
                            <svg width="80" height="30">
                              <path d="M40 -10 v40" id="individual1" />
                              ${individual1.state
                                ? svg`<circle
                                r="2.4"
                                class="individual1"
                                vector-effect="non-scaling-stroke"
                              >
                                <animateMotion
                                  dur="${this.additionalCircleRate(entities.individual1?.calculate_flow_rate, newDur.individual1)}s"
                                  repeatCount="indefinite"
                                  calcMode="linear"
                                  keyPoints=${entities.individual1?.inverted_animation ? "0;1" : "1;0"}
                                  keyTimes="0;1"

                                >
                                  <mpath xlink:href="#individual1" />
                                </animateMotion>
                              </circle>`
                                : ""}
                            </svg>
                          `
                        : html``}
                    </div> `
                  : html`<div class="spacer"></div>`}
              </div>`
            : html``}
          <div class="row">
            ${grid.isPresent
              ? html` <div class="circle-container grid">
                  <div
                    class="circle"
                    @click=${(e: { stopPropagation: () => void }) => {
                      this.openDetails(e, grid.mainEntity);
                    }}
                    @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                      if (e.key === "Enter") {
                        this.openDetails(e, grid.mainEntity);
                      }
                    }}
                  >
                    ${generalSecondarySpan(grid, "grid")}
                    <ha-icon .icon=${grid.icon}></ha-icon>
                    ${gridToGrid !== null && !grid.powerOutage.isOutage && (entities.grid?.display_zero_state || gridToGrid > 0)
                      ? html`<span class="return"
                          @click=${(e: { stopPropagation: () => void }) => {
                            const target = Array.isArray(entities.grid?.entity?.production)
                              ? entities?.grid?.entity?.production[0]
                              : entities?.grid?.entity?.production;
                            this.openDetails(e, target);
                          }}
                          @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                            if (e.key === "Enter") {
                              const target = Array.isArray(entities.grid?.entity?.production)
                                ? entities?.grid?.entity?.production[0]
                                : entities?.grid?.entity?.production;
                              this.openDetails(e, target);
                            }
                          }}
                        >
                          <ha-icon class="small" .icon=${"mdi:arrow-left"}></ha-icon>
                          ${this.displayValue(gridToGrid)}
                        </span>`
                      : null}
                    ${gridFromGrid !== null && !grid.powerOutage.isOutage && (entities.grid?.display_zero_state || gridFromGrid > 0)
                        ? html`<span class="consumption">
                            <ha-icon class="small" .icon=${"mdi:arrow-right"}></ha-icon>
                            ${this.displayValue(gridFromGrid)}
                          </span>`
                        : ""}
                    ${grid.powerOutage.isOutage
                      ? html`<span class="grid power-outage">${entities.grid?.power_outage?.label_alert || html`Power<br/>Outage`}</span>`
                      : ""}
                  </div>
                  <span class="label">${grid.name}</span>
                </div>`
              : html`<div class="spacer"></div>`}
            <div class="circle-container home">
              <div
                class="circle"
                id="home-circle"
                @click=${(e: { stopPropagation: () => void }) => {
                  this.openDetails(e, home.mainEntity);
                }}
                @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                  if (e.key === "Enter") {
                    this.openDetails(e, home.mainEntity);
                  }
                }}
              >
                <svg class="home-circle-sections">
                  ${homeSolarCircumference
                    ? svg`<circle
                            class="solar"
                            cx="40"
                            cy="40"
                            r="38"
                            stroke-dasharray="${homeSolarCircumference} ${circleCircumference - homeSolarCircumference}"
                            shape-rendering="geometricPrecision"
                            stroke-dashoffset="-${circleCircumference - homeSolarCircumference}"
                          />`
                    : ""}
                  ${homeBatteryCircumference
                    ? svg`<circle
                            class="battery"
                            cx="40"
                            cy="40"
                            r="38"
                            stroke-dasharray="${homeBatteryCircumference} ${circleCircumference - homeBatteryCircumference}"
                            stroke-dashoffset="-${circleCircumference - homeBatteryCircumference - homeSolarCircumference}"
                            shape-rendering="geometricPrecision"
                          />`
                    : ""}
                  ${homeNonFossilCircumference
                    ? svg`<circle
                            class="low-carbon"
                            cx="40"
                            cy="40"
                            r="38"
                            stroke-dasharray="${homeNonFossilCircumference} ${circleCircumference - homeNonFossilCircumference}"
                            stroke-dashoffset="-${circleCircumference - homeNonFossilCircumference - homeBatteryCircumference - homeSolarCircumference}"
                            shape-rendering="geometricPrecision"
                          />`
                    : ""}
                  <circle
                    class="${homeConsumptionError || homeValueIsZero ? `home-unknown` : `grid`}"
                    cx="40"
                    cy="40"
                    r="38"
                    stroke-dasharray="${homeGridCircumference ?? circleCircumference - homeSolarCircumference - homeBatteryCircumference} ${homeGridCircumference ? circleCircumference - homeGridCircumference : homeSolarCircumference + homeBatteryCircumference}"
                    stroke-dashoffset="0"
                    shape-rendering="geometricPrecision"
                  />
                </svg>
                ${generalSecondarySpan(home, "home")}
                <ha-icon .icon=${homeIcon}></ha-icon>
                ${homeUsageToDisplay}
              </div>
              ${this.showLine(individual1.state || 0) && individual2.isPresent ? "" : html`<span class="label">${homeName}</span>`}
            </div>
          </div>
          ${battery.isPresent || (individual1.isPresent && individual2.isPresent)
            ? html`<div class="row">
                <div class="spacer"></div>
                ${battery.isPresent
                  ? html` <div class="circle-container battery">
                      <div
                        class="circle"
                        @click=${(e: { stopPropagation: () => void }) => {
                          const target = entities.battery?.state_of_charge
                            ? entities.battery?.state_of_charge
                            : typeof entities.battery?.entity === "string"
                            ? entities.battery?.entity
                            : entities.battery?.entity!.production;
                          e.stopPropagation();
                          this.openDetails(e, target);
                        }}
                        @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                          if (e.key === "Enter") {
                            const target = entities.battery?.state_of_charge
                              ? entities.battery?.state_of_charge
                              : typeof entities.battery!.entity === "string"
                              ? entities.battery!.entity!
                              : entities.battery!.entity!.production;
                            e.stopPropagation();
                            this.openDetails(e, target);
                          }
                        }}
                      >
                        ${batteryChargeState !== null
                          ? html`<span
                              @click=${(e: { stopPropagation: () => void }) => {
                                e.stopPropagation();
                                this.openDetails(e, entities.battery?.state_of_charge);
                              }}
                              @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                                if (e.key === "Enter") {
                                  e.stopPropagation();
                                  this.openDetails(e, entities.battery?.state_of_charge);
                                }
                              }}
                              id="battery-state-of-charge-text"
                            >
                              ${this.displayValue(
                                batteryChargeState,
                                entities?.battery?.state_of_charge_unit || "%",
                                entities?.battery?.state_of_charge_decimals || 0
                              )}
                            </span>`
                          : null}
                        <ha-icon
                          .icon=${batteryIcon}
                          style=${entities.battery?.display_zero_state
                            ? "padding-top: 0px; padding-bottom: 2px;"
                            : "padding-top: 2px; padding-bottom: 0px;"}
                          @click=${(e: { stopPropagation: () => void }) => {
                            e.stopPropagation();
                            this.openDetails(e, entities.battery?.state_of_charge);
                          }}
                          @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              this.openDetails(e, entities.battery?.state_of_charge);
                            }
                          }}
                        ></ha-icon>
                        ${batteryToBattery !== null && (entities.battery?.display_zero_state || batteryToBattery > 0)
                          ? html`<span
                              class="battery-in"
                              @click=${(e: { stopPropagation: () => void }) => {
                                const target = typeof entities.battery!.entity === "string" ? entities.battery!.entity! : entities.battery!.entity!.production!;
                                e.stopPropagation();
                                this.openDetails(e, target);
                              }}
                              @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                                if (e.key === "Enter") {
                                  const target = typeof entities.battery!.entity === "string" ? entities.battery!.entity! : entities.battery!.entity!.production!;
                                  e.stopPropagation();
                                  this.openDetails(e, target);
                                }
                              }}
                            >
                              <ha-icon class="small" .icon=${"mdi:arrow-down"}></ha-icon>
                              ${this.displayValue(batteryToBattery)}
                            </span>`
                          : ""}
                        ${batteryFromBattery !== null && (entities.battery?.display_zero_state || batteryFromBattery > 0)
                          ? html`<span
                              class="battery-out"
                              @click=${(e: { stopPropagation: () => void }) => {
                                const target = typeof entities.battery!.entity === "string" ? entities.battery!.entity! : entities.battery!.entity!.consumption!;
                                e.stopPropagation();
                                this.openDetails(e, target);
                              }}
                              @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                                if (e.key === "Enter") {
                                  const target = typeof entities.battery!.entity === "string" ? entities.battery!.entity! : entities.battery!.entity!.consumption!;
                                  e.stopPropagation();
                                  this.openDetails(e, target);
                                }
                              }}
                            >
                              <ha-icon class="small" .icon=${"mdi:arrow-up"}></ha-icon>
                              ${this.displayValue(batteryFromBattery)}
                            </span>`
                          : ""}
                      </div>
                      <span class="label">${battery.name}</span>
                    </div>`
                  : html`<div class="spacer"></div>`}
                ${individual2.isPresent && individual1.isPresent
                  ? html`<div class="circle-container individual1 bottom">
                      ${this.showLine(individual1.state || 0)
                        ? html`<svg width="80" height="30">
                          <path d="M40 40 v-40" id="individual1" />
                            ${individual1.state
                              ? svg`<circle r="2.4" class="individual1" vector-effect="non-scaling-stroke">
                                <animateMotion
                                  dur="${this.additionalCircleRate(entities.individual1?.calculate_flow_rate, newDur.individual1)}s"
                                  repeatCount="indefinite"
                                  calcMode="linear"
                                  keyPoints=${entities.individual1?.inverted_animation ? "0;1" : "1;0"}
                                  keyTimes="0;1"
                                >
                                  <mpath xlink:href="#individual1" />
                                </animateMotion>
                              </circle>`
                              : ""}
                            </svg>`
                        : html` <svg width="80" height="30"></svg> `}
                      <div
                        class="circle"
                        @click=${(e: { stopPropagation: () => void }) => {
                          this.openDetails(e, individual1.mainEntity);
                        }}
                        @keyDown=${(e: { key: string; stopPropagation: () => void }) => {
                          if (e.key === "Enter") {
                            this.openDetails(e, individual1.mainEntity);
                          }
                        }}
                      >
                        ${individualSecondarySpan(individual1, "individual1")}
                        <ha-icon
                          id="individual1-icon"
                          .icon=${individual1.icon}
                          style="${individual1.secondary.isPresent ? "padding-top: 2px;" : "padding-top: 0px;"}
                          ${entities.individual1?.display_zero_state !== false || (individual1.state || 0) > 0
                            ? "padding-bottom: 2px;"
                            : "padding-bottom: 0px;"}"
                        ></ha-icon>
                        ${entities.individual1?.display_zero_state !== false || (individual1.state || 0) > 0
                          ? html` <span class="individual1">${individual1DisplayState} </span>`
                          : ""}
                      </div>
                      <span class="label">${individual1.name}</span>
                    </div>`
                  : html`<div class="spacer"></div>`}
              </div>`
            : html`<div class="spacer"></div>`}
          ${solar.isPresent && this.showLine(solarToHome || 0)
            ? html`<div
                class="lines ${classMap({
                  high: battery.isPresent,
                  "individual1-individual2": !battery.isPresent && individual2.isPresent && individual1.isPresent,
                })}"
              >
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-home-flow">
                  <path
                    id="solar"
                    class="solar"
                    d="M${battery.isPresent ? 55 : 53},0 v${grid.isPresent ? 15 : 17} c0,${battery.isPresent ? "30 10,30 30,30" : "35 10,35 30,35"} h25"
                    vector-effect="non-scaling-stroke"
                  ></path>
                  ${solarToHome
                    ? svg`<circle
                            r="1"
                            class="solar"
                            vector-effect="non-scaling-stroke"
                          >
                            <animateMotion
                              dur="${newDur.solarToHome}s"
                              repeatCount="indefinite"
                              calcMode="linear"
                            >
                              <mpath xlink:href="#solar" />
                            </animateMotion>
                          </circle>`
                    : ""}
                </svg>
              </div>`
            : ""}
          ${grid.hasReturnToGrid && solar.isPresent && this.showLine(solarToGrid ?? 0)
            ? html`<div
                class="lines ${classMap({
                  high: battery.isPresent,
                  "individual1-individual2": !battery.isPresent && individual2.isPresent && individual1.isPresent
                })}"
              >
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-grid-flow">
                  <path
                    id="return"
                    class="return"
                    d="M${battery.isPresent ? 45 : 47},0 v15 c0,${battery.isPresent ? "30 -10,30 -30,30" : "35 -10,35 -30,35"} h-20"
                    vector-effect="non-scaling-stroke"
                  ></path>
                  ${solarToGrid && solar.isPresent
                    ? svg`<circle
                        r="1"
                        class="return"
                        vector-effect="non-scaling-stroke"
                      >
                        <animateMotion
                          dur="${newDur.solarToGrid}s"
                          repeatCount="indefinite"
                          calcMode="linear"
                        >
                          <mpath xlink:href="#return" />
                        </animateMotion>
                      </circle>`
                    : ""}
                </svg>
              </div>`
            : ""}
          ${battery.isPresent && solar.isPresent && this.showLine(solarToBattery || 0)
            ? html`<div
                class="lines ${classMap({
                  high: battery.isPresent,
                  "individual1-individual2": !battery.isPresent && individual2.isPresent && individual1.isPresent
                })}"
              >
                <svg
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid slice"
                  id="solar-battery-flow"
                  class="flat-line"
                >
                  <path id="battery-solar" class="battery-solar" d="M50,0 V100" vector-effect="non-scaling-stroke"></path>
                  ${solarToBattery
                    ? svg`<circle
                            r="1"
                            class="battery-solar"
                            vector-effect="non-scaling-stroke"
                          >
                            <animateMotion
                              dur="${newDur.solarToBattery}s"
                              repeatCount="indefinite"
                              calcMode="linear"
                            >
                              <mpath xlink:href="#battery-solar" />
                            </animateMotion>
                          </circle>`
                    : ""}
                </svg>
              </div>`
            : ""}
          ${grid.isPresent && this.showLine(gridFromGrid)
            ? html`<div
                class="lines ${classMap({
                  high: battery.isPresent,
                  "individual1-individual2": !battery.isPresent && individual2.isPresent && individual1.isPresent
                })}"
              >
                <svg
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid slice"
                  id="grid-home-flow"
                  class="flat-line"
                >
                  <path class="grid" id="grid" d="M0,${battery.isPresent ? 50 : solar.isPresent ? 56 : 53} H100" vector-effect="non-scaling-stroke"></path>
                  ${gridToHome
                    ? svg`<circle
                    r="1"
                    class="grid"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${newDur.gridToHome}s"
                      repeatCount="indefinite"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#grid" />
                    </animateMotion>
                  </circle>`
                    : ""}
                </svg>
              </div>`
            : null}
          ${battery.isPresent && this.showLine(batteryToHome)
            ? html`<div
                class="lines ${classMap({
                  high: battery.isPresent,
                  "individual1-individual2": !battery.isPresent && individual2.isPresent && individual1.isPresent
                })}"
              >
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="battery-home-flow">
                  <path
                    id="battery-home"
                    class="battery-home"
                    d="M55,100 v-${grid.isPresent ? 15 : 17} c0,-30 10,-30 30,-30 h20"
                    vector-effect="non-scaling-stroke"
                  ></path>
                  ${batteryToHome
                    ? svg`<circle
                        r="1"
                        class="battery-home"
                        vector-effect="non-scaling-stroke"
                      >
                        <animateMotion
                          dur="${newDur.batteryToHome}s"
                          repeatCount="indefinite"
                          calcMode="linear"
                        >
                          <mpath xlink:href="#battery-home" />
                        </animateMotion>
                      </circle>`
                    : ""}
                </svg>
              </div>`
            : ""}
          ${grid.isPresent && battery.isPresent && this.showLine(Math.max(gridToBattery || 0, batteryToGrid || 0))
            ? html`<div
                class="lines ${classMap({
                  high: battery.isPresent,
                  "individual1-individual2": !battery.isPresent && individual2.isPresent && individual1.isPresent
                })}"
              >
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="battery-grid-flow">
                  <path
                    id="battery-grid"
                    class=${classMap({
                      "battery-from-grid": Boolean(gridToBattery),
                      "battery-to-grid": Boolean(batteryToGrid)
                    })}
                    d="M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20"
                    vector-effect="non-scaling-stroke"
                  ></path>
                  ${gridToBattery
                    ? svg`<circle
                    r="1"
                    class="battery-from-grid"
                    vector-effect="non-scaling-stroke"
                  >
                    <animateMotion
                      dur="${newDur.batteryGrid}s"
                      repeatCount="indefinite"
                      keyPoints="1;0" keyTimes="0;1"
                      calcMode="linear"
                    >
                      <mpath xlink:href="#battery-grid" />
                    </animateMotion>
                  </circle>`
                    : ""}
                  ${batteryToGrid
                    ? svg`<circle
                        r="1"
                        class="battery-to-grid"
                        vector-effect="non-scaling-stroke"
                      >
                        <animateMotion
                          dur="${newDur.batteryGrid}s"
                          repeatCount="indefinite"
                          calcMode="linear"
                        >
                          <mpath xlink:href="#battery-grid" />
                        </animateMotion>
                      </circle>`
                    : ""}
                </svg>
              </div>`
            : ""}
        </div>
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

  private additionalCircleRate = (entry?: boolean | number, value?: number): number | boolean | undefined => {
    if (entry === true && value) {
      return value;
    }

    if (isNumberValue(entry)) {
      return entry;
    }

    return 1.66;
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

    const valueInNumber = new Decimal(value);
    const isMWh = !unit && valueInNumber.abs().dividedBy(1000).greaterThanOrEqualTo(new Decimal(this._config.kwh_mwh_threshold!));
    const isKWh = !unit && valueInNumber.abs().greaterThanOrEqualTo(new Decimal(this._config.wh_kwh_threshold!));
    const formattedValue = formatNumber(
      isMWh
        ? valueInNumber.dividedBy(1000000).toDecimalPlaces(this._config.mwh_decimals).toString()
        : isKWh
          ? valueInNumber.dividedBy(1000).toDecimalPlaces(this._config.kwh_decimals).toString()
          : valueInNumber.toDecimalPlaces(decimals ?? this._config.wh_decimals).toString(),
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

  private hasField = (field?: any, acceptStringState?: boolean): boolean => {
    if (!field) {
      return false;
    }

    return (
      field?.display_zero === true || (this.getEntityStateWattHours(field?.entity) > (field?.display_zero_tolerance ?? 0) && Array.isArray(field?.entity)
        ? entityAvailable(this.hass, field?.mainEntity)
        : entityAvailable(this.hass, field?.entity)) || acceptStringState
          ? typeof this.hass.states[field?.entity]?.state === "string"
          : false
    );
  };

  /**
   * Depending on if the user has decided to show inactive lines, decide if this line should be shown.
   * @param energy - energy value to check
   * @returns boolean to decide if line should be shown (true = show, false = don't show)
   */
  private showLine = (energy: number): boolean => this._config?.display_zero_lines === true || energy > 0;

  /**
   * Depending on if the user has defined the icon or wants to use the entity icon, return the icon to display.
   * @param field - field object (eg: solar) OBJECT
   * @param fallback - fallback icon (eg: mdi:solar-power)
   * @returns icon to display in format mdi:icon
   */
  private computeFieldIcon = (field: any, fallback: string): string => {
    if (field?.icon) {
      return field.icon;
    }

    if (field?.use_metadata) {
      return getEntityStateObj(this.hass, field.entity)?.attributes?.icon ?? "";
    }

    return fallback;
  };

  /**
   * Depending on if the user has defined the name or wants to use the entity name, return the name to display.
   * @param field - field object (eg: solar) OBJECT
   * @param fallback - fallback name (eg: Solar)
   * @returns name to display
   */
  private computeFieldName = (field: any, fallback: string): string => {
    if (field?.name) {
      return field.name;
    }

    if (field?.use_metadata) {
      return getEntityStateObj(this.hass, field.entity)?.attributes?.friendly_name ?? "";
    }

    return fallback;
  };

  /**
   * Convert a an array of values in the format [r, g, b] to a hex color.
   * @param colorList - array of values in the format [r, g, b]
   * @returns hex color
   * @example
   * convertColorListToHex([255, 255, 255]) // returns #ffffff
   * convertColorListToHex([0, 0, 0]) // returns #000000
   */
  private convertColorListToHex = (colorList: number[]): string => "#".concat(colorList.map((x) => x.toString(16).padStart(2, "0")).join(""));

  private getSecondaryState = (field: SecondaryInfoEntity, name: EntityType): string | number | null => {
    if (field.isPresent) {
      const secondaryEntity = field?.entity;
      const secondaryState = secondaryEntity && this.getEntityStateWattHours(secondaryEntity);

      if (typeof secondaryState === "number") {
        return secondaryState * (this.entityInverted(name) ? -1 : 1);
      }

      if (typeof secondaryState === "string") {
        return secondaryState;
      }
    }

    return null;
  };
}
