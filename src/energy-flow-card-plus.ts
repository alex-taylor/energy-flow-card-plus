/* eslint-disable @typescript-eslint/no-explicit-any */
import { html, LitElement, PropertyValues, svg, TemplateResult } from "lit";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { formatNumber, HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import { Decimal } from "decimal.js";
import { customElement, property, state } from "lit/decorators.js";
import { getDefaultConfig } from "./config/config";
import { EnergyCollection, EnergyData, getEnergyDataCollection, getStatistics, Statistics, StatisticValue } from "./energy";
import { SubscribeMixin } from "./energy/subscribe-mixin";
import { HomeAssistantReal } from "./hass";
import localize from "./localize/localize";
import { styles } from "./style";
import type { EnergyFlowCardPlusConfig, EntityConfig } from "./config";
import { BatteryState } from "./states/battery";
import { GridState } from "./states/grid";
import { SolarState } from "./states/solar";
import { SecondaryInfoEntity } from "./states/secondary-info";
import { coerceNumber, isNumberValue, mapRange } from "./utils";
import { registerCustomCard } from "./utils/register-custom-card";
import { Flows, calculateStatisticsFlows, getLiveDeltas } from "./flows";
import { entityExists, getEntityStateWattHours, toWattHours } from "./states";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { differenceInDays, startOfDay } from 'date-fns';
import { ColourMode, DisplayMode, DotsMode, EntityType, LowCarbonType, ZeroLinesMode } from "./enums";
import { HomeState } from "./states/home";
import { LowCarbonState } from "./states/low-carbon";
import { State } from "./states/state";

registerCustomCard({
  type: "energy-flow-card-plus",
  name: "Energy Flow Card Plus",
  description: "A custom card for displaying energy flow in Home Assistant. Inspired by the official Energy Distribution Card.",
});

const ENERGY_DATA_TIMEOUT: number = 10000;
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

  private _grid!: GridState;
  private _solar!: SolarState;
  private _battery!: BatteryState;
  private _home!: HomeState;
  private _lowCarbon!: LowCarbonState;
  private _previousDur: { [name: string]: number } = {};

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    this.initEntities(this._config);
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

    setTimeout(() => {
      if (!this._error && !this._statistics) {
        this._error = new Error("No energy data received.");
        console.debug(getEnergyDataCollection(this.hass));
      }
    }, ENERGY_DATA_TIMEOUT * 2);

    energyPromise.catch((err) => this._error = err);

    return [
      energyPromise.then(async (collection: EnergyCollection) => {
        return collection.subscribe(async (data: EnergyData) => {
          this._loading = true;
          this._energyData = data;

          if (this._entitiesArr) {
            let periodStart: Date;
            let periodEnd: Date;

            if (this._config.display_mode === DisplayMode.Today) {
              periodEnd = new Date();
              periodStart = startOfDay(periodEnd);
            } else {
              periodStart = data.start;
              periodEnd = data.end ?? new Date();
            }

            const entities: string[] = data.co2SignalEntity ? this._entitiesArr.concat(data.co2SignalEntity) : this._entitiesArr;
            const period = this._config.appearance?.use_hourly_stats || differenceInDays(periodEnd, periodStart) <= 2 ? 'hour' : 'day';
            this._statistics = await getStatistics(this.hass, periodStart, periodEnd, entities, period);
            calculateStatisticsFlows(this.hass, this._statistics, this._solar, this._battery, this._grid);
          }

          this._loading = false;
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

    this._config = config;
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

    if (!this._energyData && this._config.display_mode !== DisplayMode.Today) {
      return html`<ha-card style="padding: 2rem">
        ${this.hass.localize("ui.panel.lovelace.cards.energy.loading")}<br />Make sure you have the Energy Integration setup and a Date Selector in this View or set
        <pre>display_mode: live</pre>
        </ha-card>`;
    }

    // show pointer if clickable entities is enabled
    this.style.setProperty("--clickable-cursor", this._config.appearance?.clickable_entities ? "pointer" : "default");

    const grid: GridState = this._grid;
    const solar: SolarState = this._solar;
    const battery: BatteryState = this._battery;
    //const individual1: DeviceState = this._individual1;
    //const individual2: DeviceState = this._individual2;
    const fossilFuel: LowCarbonState = this._lowCarbon;

    // Override in case of Power Outage
    if (grid.powerOutage.isOutage && grid.powerOutage.icon) {
      grid.icon = grid.powerOutage.icon;
    }

    // Update Color of Grid Consumption
    if (grid.config?.consumption_colour) {
      this.style.setProperty("--energy-grid-consumption-color", this.convertColorListToHex(grid.config?.consumption_colour) || "var(--energy-grid-consumption-color)" || "#488fc2");
    }

    // Update Color of Grid Production
    if (grid.config?.production_colour) {
      this.style.setProperty("--energy-grid-return-color", this.convertColorListToHex(grid.config?.production_colour) || "#a280db");
    }

    // Update and Set Color of Grid Icon
    this.style.setProperty(
      "--icon-grid-color",
      grid.config?.colour_of_icon === ColourMode.Consumption
        ? "var(--energy-grid-consumption-color)"
        : grid.config?.colour_of_icon === ColourMode.Production
          ? "var(--energy-grid-return-color)"
          : grid.config?.colour_of_icon === ColourMode.Colour_Dynamically
            ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Grid Secondary
    this.style.setProperty(
      "--secondary-text-grid-color",
      grid.config?.colour_values
        ? grid.config?.colour_of_circle === ColourMode.Consumption
          ? "var(--energy-grid-consumption-color)"
          : grid.config?.colour_of_circle === ColourMode.Production
            ? "var(--energy-grid-return-color)"
            : grid.config?.colour_of_circle === ColourMode.Colour_Dynamically
              ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
                ? "var(--energy-grid-consumption-color)"
                : "var(--energy-grid-return-color)"
              : "var(--primary-text-color)"
        : "var(--primary-text-color)"
    );

    // Update and Set Color of Grid Circle
    this.style.setProperty(
      "--circle-grid-color",
      grid.config?.colour_of_circle === ColourMode.Consumption
        ? "var(--energy-grid-consumption-color)"
        : grid.config?.colour_of_circle === ColourMode.Production
          ? "var(--energy-grid-return-color)"
          : grid.config?.colour_of_circle === ColourMode.Colour_Dynamically
            ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)"
            : "var(--energy-grid-consumption-color)"
    );

    // Update States Values of Individuals
    //individual1.state = individual1.isPresent ? this.getEntityStateWattHours(entities.individual1?.entity) : 0;
    //individual2.state = individual2.isPresent ? this.getEntityStateWattHours(entities.individual2?.entity) : 0;

    // Update and Set Color of Individuals
    //if (individual1.color) {
    //  if (typeof individual1.color === "object") {
    //    individual1.color = this.convertColorListToHex(individual1.color);
    //  }

    //  this.style.setProperty("--individualone-color", individual1.color); // dynamically update color of entity depending on user's input
    //}

    //if (individual2.color) {
    //  if (typeof individual2.color === "object") {
    //    individual2.color = this.convertColorListToHex(individual2.color);
    //  }

    //  this.style.setProperty("--individualtwo-color", individual2.color); // dynamically update color of entity depending on user's input
    //}

    // Update and Set Color of Individuals Icon
    //this.style.setProperty("--icon-individualone-color", entities.individual1?.color_icon ? "var(--individualone-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--icon-individualtwo-color", entities.individual2?.color_icon ? "var(--individualtwo-color)" : "var(--primary-text-color)");

    // Update and Set Color of Solar
    if (solar?.config?.colour) {
      this.style.setProperty("--energy-solar-color", this.convertColorListToHex(solar.config.colour) || "#ff9800");
    }

    this.style.setProperty("--icon-solar-color", solar?.config?.colour_icon ? "var(--energy-solar-color)" : "var(--primary-text-color)");

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
    let highCarbonEnergy: number = 0;
    let lowCarbonEnergy: number = 0;
    let lowCarbonPercentage: number = 0;

    // unless we're in 'history' mode, we need to bring the stats right up to date by taking the current values of the sensors
    let gridFromGridDelta: number = 0;

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
      gridFromGridDelta = deltas.gridToBattery + deltas.gridToHome;

      solarToHome += deltas.solarToHome;
      solarToGrid += deltas.solarToGrid;
      solarToBattery += deltas.solarToBattery;
      solarTotal += deltas.solarToHome + deltas.solarToGrid + deltas.solarToBattery;

      gridToBattery += deltas.gridToBattery;
      gridToHome += deltas.gridToHome;
      gridFromGrid += gridFromGridDelta;
      gridToGrid += deltas.solarToGrid + deltas.batteryToGrid;

      batteryToGrid += deltas.batteryToGrid;
      batteryToHome += deltas.batteryToHome;
      batteryFromBattery += deltas.batteryToGrid + deltas.batteryToHome;
      batteryToBattery += deltas.solarToBattery + deltas.gridToBattery;
    }

    // TODO support multiple entities
    const entity: string | undefined = grid?.config?.consumption_entities?.entity_ids ? grid.config.consumption_entities.entity_ids[0] : undefined;

    if (entity && this._statistics && this._energyData && this._energyData.co2SignalEntity && this._energyData.fossilEnergyConsumption && this._statistics[entity]) {
      const highCarbonPercentageStats: StatisticValue[] = this._statistics[this._energyData!.co2SignalEntity];
      const stateObj = this.hass.states[entity];
      const units = stateObj.attributes.unit_of_measurement;
      let idx = 0;

      this._statistics[entity].forEach(gridStat => {
        const change: number = toWattHours(units, gridStat.change || 0);

        if (highCarbonPercentageStats && highCarbonPercentageStats.length !== 0) {
          while (idx < highCarbonPercentageStats.length) {
            const percentageStart = highCarbonPercentageStats[idx].start;

            if (percentageStart == gridStat.start) {
              highCarbonEnergy += change * (highCarbonPercentageStats[idx].mean || 0) / 100;
              idx++;
              break;
            }

            if (percentageStart > gridStat.start) {
              // the grid started first
              highCarbonEnergy += change;
              break;
            }

            // the percentage started first
            idx++;
          }
        } else {
          highCarbonEnergy += change;
        }
      });

      if (this._config.display_mode !== DisplayMode.History) {
        highCarbonEnergy += gridFromGridDelta * coerceNumber(this.hass.states[this._energyData.co2SignalEntity].state) / 100;
      }

      lowCarbonEnergy = gridFromGrid - highCarbonEnergy;
      lowCarbonPercentage = (lowCarbonEnergy / gridFromGrid) * 100;
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
    if (battery.config?.consumption_colour !== undefined) {
      this.style.setProperty("--energy-battery-out-color", this.convertColorListToHex(battery.config?.consumption_colour) || "#4db6ac");
    }

    // Update and Set Color of Battery Production
    if (battery.config?.production_colour !== undefined) {
      this.style.setProperty("--energy-battery-in-color", this.convertColorListToHex(battery.config?.production_colour) || "#a280db");
    }

    // Update and Set Color of Battery Icon
    this.style.setProperty(
      "--icon-battery-color",
      battery.config?.colour_of_icon === ColourMode.Consumption
        ? "var(--energy-battery-in-color)"
        : battery.config?.colour_of_icon === ColourMode.Production
          ? "var(--energy-battery-out-color)"
          : battery.config?.colour_of_icon === ColourMode.Colour_Dynamically
            ? batteryFromBattery >= batteryToBattery
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Battery Circle
    this.style.setProperty(
      "--circle-battery-color",
      battery.config?.colour_of_circle === ColourMode.Consumption
        ? "var(--energy-battery-in-color)"
        : battery.config?.colour_of_circle === ColourMode.Production
          ? "var(--energy-battery-out-color)"
          : battery.config?.colour_of_circle === ColourMode.Colour_Dynamically
            ? batteryFromBattery >= batteryToBattery
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)"
            : "var(--energy-battery-in-color)"
    );

    // Calculate Sum of Both Individual Devices's State Values
    //const totalIndividualConsumption = coerceNumber(individual1.state, 0) + coerceNumber(individual2.state, 0);

    // Calculate Circumference of Semi-Circles
    // TODO: totalHomeConsumption may be zero by this point
    const homeBatteryCircumference: number = CIRCLE_CIRCUMFERENCE * (batteryToHome / totalHomeConsumption);
    const homeSolarCircumference: number = CIRCLE_CIRCUMFERENCE * (solarToHome / totalHomeConsumption);
    const highCarbonConsumption: number = highCarbonEnergy * (gridToHome / gridFromGrid);
    const homeHighCarbonCircumference: number = CIRCLE_CIRCUMFERENCE * (highCarbonConsumption / totalHomeConsumption);
    const homeLowCarbonCircumference: number = CIRCLE_CIRCUMFERENCE - homeSolarCircumference - homeBatteryCircumference - homeHighCarbonCircumference;

    const totalLines = solarToHome + solarToGrid + solarToBattery + gridToHome + gridToBattery + batteryToHome + batteryToGrid;

    const newDur = {
      batteryToGrid: this.circleRate(batteryToGrid ?? 0, totalLines),
      batteryToHome: this.circleRate(batteryToHome ?? 0, totalLines),
      gridToHome: this.circleRate(gridToHome, totalLines),
      gridToBattery: this.circleRate(gridToBattery ?? 0, totalLines),
      solarToBattery: this.circleRate(solarToBattery ?? 0, totalLines),
      solarToGrid: this.circleRate(solarToGrid ?? 0, totalLines),
      solarToHome: this.circleRate(solarToHome ?? 0, totalLines),
      //individual1: this.circleRate(individual1.state ?? 0, totalIndividualConsumption),
      //individual2: this.circleRate(individual2.state ?? 0, totalIndividualConsumption),
      lowCarbon: this.circleRate(lowCarbonEnergy ?? 0, totalLines),
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

    let nonFossilColour = this._config.low_carbon?.colour;

    if (nonFossilColour !== undefined) {
      this.style.setProperty("--non-fossil-color", this.convertColorListToHex(nonFossilColour) ?? "var(--energy-non-fossil-color)");
    }

    this.style.setProperty("--icon-non-fossil-color", this._config.low_carbon?.colour_icon ? "var(--non-fossil-color)" : "var(--primary-text-color)" ?? "var(--non-fossil-color)");

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
        value: lowCarbonEnergy,
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
      switch (this._config.home?.color_of_icon) {
        case ColourMode.Solar:
          iconHomeColor = "var(--energy-solar-color)";
          break;

        case ColourMode.Battery:
          iconHomeColor = "var(--energy-battery-out-color)";
          break;

        case ColourMode.High_Carbon:
          iconHomeColor = "var(--energy-grid-consumption-color)";
          break;

        case ColourMode.Low_Carbon:
          iconHomeColor = "var(--energy-non-fossilcolor)";
          break;

        case ColourMode.Colour_Dynamically:
          iconHomeColor = homeSources[homeLargestSource].color;
          break;

        default:
          iconHomeColor = "var(--primary-text-color)";
          break;
      }

      switch (this._config.home?.color_of_value) {
        case ColourMode.Solar:
          textHomeColor = "var(--energy-solar-color)";
          break;

        case ColourMode.Battery:
          textHomeColor = "var(--energy-battery-out-color)";
          break;

        case ColourMode.High_Carbon:
          textHomeColor = "var(--energy-grid-consumption-color)";
          break;

        case ColourMode.Low_Carbon:
          iconHomeColor = "var(--energy-non-fossilcolor)";
          break;

        case ColourMode.Colour_Dynamically:
          textHomeColor = homeSources[homeLargestSource].color;
          break;

        default:
          textHomeColor = "var(--primary-text-color)";
          break;
      }
    }

    this.style.setProperty("--icon-home-color", iconHomeColor);
    this.style.setProperty("--text-home-color", textHomeColor);
    this.style.setProperty("--text-solar-color", this._config.solar?.colour_value ? "var(--energy-solar-color)" : "var(--primary-text-color)");
    this.style.setProperty("--text-non-fossil-color", this._config.low_carbon?.colour_value ? "var(--non-fossil-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--secondary-text-non-fossil-color", this._config.low_carbon?.secondary_info?.colour_of_value ? "var(--non-fossil-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--text-individualone-color", this._config.individual1?.color_value ? "var(--individualone-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--text-individualtwo-color", this._config.individual2?.color_value ? "var(--individualtwo-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--secondary-text-individualone-color", this._config.individual1?.secondary_info?.color_of_value ? "var(--individualone-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--secondary-text-individualtwo-color", this._config.individual2?.secondary_info?.color_of_value ? "var(--individualtwo-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--secondary-text-solar-color", this._config.solar?.secondary_info?.colour_of_value ? "var(--energy-solar-color)" : "var(--primary-text-color)");
    //this.style.setProperty("--secondary-text-home-color", this._config.home?.secondary_info?.colour_of_value ? "var(--text-home-color)" : "var(--primary-text-color)");

    let homeUsageToDisplay: string;

    if (homeConsumptionError) {
      homeUsageToDisplay = localize("common.unknown");
    } else {
      // TODO: handle device math in here
      homeUsageToDisplay = totalHomeConsumption != 0 || this._config.appearance?.display_zero_state ? this.displayValue(totalHomeConsumption) : "";
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

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content" id="energy-flow-card-plus">

        <!-- top row -->
        ${fossilFuel.isPresent || solar.isPresent// || individual1.isPresent
        ? html`
          <div class="row">

            <!-- top left -->
            ${lowCarbonEnergy == 0
        ? html`<div class="spacer"></div>`
        : html`${this.renderIndividualCircleAtTop(EntityType.LowCarbon, fossilFuel, this._config.low_carbon?.display === LowCarbonType.Percentage ? lowCarbonPercentage : lowCarbonEnergy, -newDur.lowCarbon)}`}

            <!-- top middle -->
            ${solar.isPresent
            ? html`${this.renderSolarCircle(solarTotal)}`
            : false //individual1.isPresent
              ? html`<div class="spacer"></div>`
              : ""}

            <!-- top right -->
            <div class="spacer"></div>

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
          homeLowCarbonCircumference,
          homeHighCarbonCircumference,
          homeConsumptionError,
          homeValueIsZero,
          homeUsageToDisplay)}

        </div>

        <!-- bottom row -->
        ${battery.isPresent //|| individual2.isPresent
        ? html`
          <div class="row">

            <!-- bottom left -->
            <div class="spacer"></div>

            <!-- bottom middle -->
            ${battery.isPresent
            ? html`${this.renderBatteryCircle(batteryToBattery, batteryFromBattery)}`
            : html`<div class="spacer"></div>`}

            <!-- bottom right -->
            <div class="spacer"></div>

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
      ${this._config.appearance?.dashboard_link
        ? html`
          <div class="card-actions">
            <a href=${this._config.appearance?.dashboard_link}>
              <mwc-button>
                ${this._config.appearance?.dashboard_link_label || this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard")}
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
    this._grid = new GridState(this.hass, entities.grid);
    this._solar = new SolarState(this.hass, entities.solar);
    this._battery = new BatteryState(this.hass, entities.battery);
    this._home = new HomeState(this.hass, entities.home);
    //this._individual1 = new DeviceState(this.hass, entities.individual1, EntityType.Individual1, localize("card.label.car"), "mdi:car-electric");
    //this._individual2 = new DeviceState(this.hass, entities.individual2, EntityType.Individual2, localize("card.label.motorbike"), "mdi:motorbike-electric");
    this._lowCarbon = new LowCarbonState(this.hass, entities.low_carbon);
  };

  private populateEntitiesArr = (): void => {
    this._entitiesArr = [];

    if (this._config?.battery?.consumption_entities?.entity_ids?.length) {
      this._config.battery.consumption_entities.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.battery?.secondary_info?.entity?.entity_ids?.length) {
      this._config.battery.secondary_info.entity.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.battery?.production_entities?.entity_ids?.length) {
      this._config.battery.production_entities.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.grid?.consumption_entities?.entity_ids?.length) {
      this._config.grid.consumption_entities.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.grid?.production_entities?.entity_ids?.length) {
      this._config.grid.production_entities.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.grid?.secondary_info?.entity?.entity_ids?.length) {
      this._config.grid.secondary_info.entity.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.low_carbon?.entities?.entity_ids?.length) {
      this._config.low_carbon.entities.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.low_carbon?.secondary_info?.entity?.entity_ids?.length) {
      this._config.low_carbon.secondary_info.entity.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.solar?.entities?.entity_ids?.length) {
      this._config.solar.entities.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    if (this._config?.solar?.secondary_info?.entity?.entity_ids?.length) {
      this._config.solar.secondary_info.entity.entity_ids.forEach(id => this._entitiesArr.push(id));
    }

    // TODO: add the Devices

    this._entitiesArr = this._entitiesArr.filter((entity) => entity);
  };

  private getEntityStateWattHours = (entities: EntityConfig | undefined): number => getEntityStateWattHours(this.hass, this._statistics, entities);

  private circleRate = (value: number, total: number): number => {
    const maxRate = this._config.appearance?.flows?.max_flow_rate!;
    const minRate = this._config.appearance?.flows?.min_flow_rate!;

    if (this._config?.appearance?.flows?.mode === DotsMode.Dynamic) {
      const maxEnergy = this._config.appearance?.flows?.max_expected_energy!;
      const minEnergy = this._config.appearance?.flows?.min_expected_energy!;
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
    const isMWh = (!unit || unit.toUpperCase().startsWith("MWH")) && valueAsNumber.abs().dividedBy(1000).greaterThanOrEqualTo(new Decimal(this._config.appearance?.energy_units?.kwh_mwh_threshold!));
    const isKWh = (!unit || unit.toUpperCase().startsWith("KWH")) && valueAsNumber.abs().greaterThanOrEqualTo(new Decimal(this._config.appearance?.energy_units ?.wh_kwh_threshold!));
    const formattedValue = formatNumber(
      isMWh
        ? valueAsNumber.dividedBy(1000000).toDecimalPlaces(decimals ?? this._config.appearance?.energy_units?.mwh_decimals).toString()
        : isKWh
          ? valueAsNumber.dividedBy(1000).toDecimalPlaces(decimals ?? this._config.appearance?.energy_units?.kwh_decimals).toString()
          : valueAsNumber.toDecimalPlaces(decimals ?? this._config.appearance?.energy_units?.wh_decimals).toString(),
      this.hass.locale
    );

    return `${formattedValue}${this._config.appearance?.unit_white_space ? " " : ""}${unit ?? (isMWh ? "MWh" : isKWh ? "kWh" : "Wh")}`;
  };

  private openDetails = (event: { stopPropagation: any; key?: string }, entityId?: string | undefined): void => {
    event.stopPropagation();

    if (!entityId || !this._config.appearance?.clickable_entities) {
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
  private showLine = (energy: number): boolean => this._config?.appearance?.display_zero_lines?.mode === ZeroLinesMode.Show || energy > 0;

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
      const secondaryEntity: EntityConfig = entity?.config?.entity!;
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

  private renderSecondarySpan = (secondary: SecondaryInfoEntity, type: EntityType): TemplateResult => {
    if (!secondary.isPresent || !secondary.config?.entity?.entity_ids?.length) {
      return html``;
    }

    const entity: string = secondary.config?.entity.entity_ids[0];
    let state: string | number | null = this.getSecondaryState(secondary, type);

    state = isNumberValue(secondary) && Math.abs(coerceNumber(state)) < (secondary.config.entity.zero_threshold ?? 0)
      ? 0
      : state;

    if (secondary) {
      return html`
        <span class="secondary-info ${type}" @click=${this.handleClick(entity)} @keyDown=${(this.handleKeyDown(entity))}>
          ${secondary.icon ? html`<ha-icon class="secondary-info small" .icon=${secondary.icon}></ha-icon>` : ""}
          ${secondary.config.template ?? this.displayValue(state, secondary.config.entity.units, secondary.config.entity.decimals)}
        </span>
      `;
    }

    return html``;
  };

  private renderHomeCircle = (
    homeSolarCircumference: number,
    homeBatteryCircumference: number,
    homeLowCarbonCircumference: number,
    homeHighCarbonCircumference: number,
    homeConsumptionError: boolean,
    homeValueIsZero: boolean,
    homeUsageToDisplay: string
  ): TemplateResult => {
    const home: HomeState = this._home;
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

          ${homeLowCarbonCircumference
        ? svg`
            <circle
              class="low-carbon"
              cx="40"
              cy="40"
              r="38"
              stroke-dasharray="${homeLowCarbonCircumference} ${CIRCLE_CIRCUMFERENCE - homeLowCarbonCircumference}"
              stroke-dashoffset="-${CIRCLE_CIRCUMFERENCE - homeLowCarbonCircumference - homeBatteryCircumference - homeSolarCircumference}"
              shape-rendering="geometricPrecision"
            />
            `
        : ""}

            <circle
              class="${homeConsumptionError || homeValueIsZero ? `home-unknown` : `grid`}"
              cx = "40"
              cy = "40"
              r = "38"
              stroke-dasharray="${homeHighCarbonCircumference ?? CIRCLE_CIRCUMFERENCE - homeSolarCircumference - homeBatteryCircumference - homeLowCarbonCircumference} ${homeSolarCircumference + homeBatteryCircumference + homeLowCarbonCircumference}"
              stroke-dashoffset="0"
              shape-rendering="geometricPrecision"
            />
          </svg>
          ${this.renderSecondarySpan(home.secondary, EntityType.HomeSecondary)}
          <ha-icon class="entity-icon" .icon=${home.icon}></ha-icon>
          ${homeUsageToDisplay}
        </div>

        <span class="label">${home.name}</span>
      </div>
    `;
  };

  private renderGridCircle = (gridToGrid: number, gridFromGrid: number): TemplateResult => {
    const gridIcon: string =
      this._grid.powerOutage.isOutage
        ? this._config.grid?.power_outage?.icon_alert ?? "mdi:transmission-tower-off"
        : this._grid.icon;

    const productionEntity: string | undefined = this._grid.config?.production_entities?.entity_ids?.length ? this._grid.config.production_entities.entity_ids[0] : undefined;

    return html`
      ${this._grid.isPresent
        ? html`
        <div class="circle-container grid">
          <div class="circle" @click=${this.handleClick(this._grid.mainEntity)} @keyDown=${this.handleKeyDown(this._grid.mainEntity)}>
          ${this.renderSecondarySpan(this._grid.secondary, EntityType.Grid_Secondary)}
          <ha-icon class="entity-icon" .icon=${gridIcon}></ha-icon>
          ${!this._grid.powerOutage.isOutage && (this._config.appearance?.display_zero_state || gridToGrid != 0)
            ? html`
            <span class="return" @click=${this.handleClick(productionEntity)} @keyDown=${this.handleKeyDown(productionEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-left"}></ha-icon>
              ${this.displayValue(gridToGrid)}
            </span>
            `
            : null}
            ${!this._grid.powerOutage.isOutage && (this._config.appearance?.display_zero_state || gridFromGrid != 0)
            ? html`
            <span class="consumption">
              <ha-icon class="small" .icon=${"mdi:arrow-right"}></ha-icon>
              ${this.displayValue(gridFromGrid)}
            </span>`
            : ""}
            ${this._grid.powerOutage.isOutage
            ? html`
            <span style="padding-top: 2px;" class="grid power-outage">${this._config.grid?.power_outage?.label_alert || html`Power<br/>Outage`}</span>`
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
          ${this._config.appearance?.display_zero_state || solarTotal != 0 ? html`<span class="solar">${this.displayValue(solarTotal)}</span>` : ""}
        </div>
      </div>
    `;
  };

  private renderBatteryCircle = (batteryToBattery: number, batteryFromBattery: number): TemplateResult => {
    const battery = this._config.battery;
    let batteryIcon = "mdi:battery-high";

    if (battery?.icon) {
      batteryIcon = battery?.icon;
    }

    return html`
      <div class="circle-container battery">
        <div class="circle" @click=${this.handleClick(this._battery.mainEntity)} @keyDown=${this.handleKeyDown(this._battery.mainEntity)}>
          <ha-icon class="entity-icon" .icon=${batteryIcon}></ha-icon>
          ${this._config.appearance?.display_zero_state || batteryToBattery != 0
      ? html`
            <span class="battery-in" style="padding-top: 2px;" @click=${this.handleClick(this._battery.returnEntity)} @keyDown=${this.handleKeyDown(this._battery.returnEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-down"}></ha-icon>
              ${this.displayValue(batteryToBattery)}
            </span>
            `
        : ""}

          ${this._config.appearance?.display_zero_state || batteryFromBattery != 0
        ? html`
            <span class="battery-out" style="padding-top: 2px;" @click=${this.handleClick(this._battery.mainEntity)} @keyDown=${this.handleKeyDown(this._battery.mainEntity)}>
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

  private renderIndividualCircleAtTop = (type: EntityType, entity: State, state: number, animDuration: number): TemplateResult => {
    return html`
      <div class="circle-container ${type}">
        <span class="label">${entity.name}</span>
        <div class="circle" @click=${this.handleClick(entity.mainEntity)} @keyDown=${this.handleKeyDown(entity.mainEntity)}>
          ${this.renderSecondarySpan(entity.secondary, type)}
          <ha-icon class="entity-icon" .icon=${entity.icon}></ha-icon>
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

  private renderIndividualCircleAtBottom = (type: EntityType, entity: State, state: number, animDuration: number): TemplateResult => {
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
          <ha-icon class="entity-icon" .icon=${entity.icon}></ha-icon>
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
      ${this._grid.hasReturn && this._solar.isPresent && this.showLine(value ?? 0)
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
//        : this._individual1.isPresent && this._individual2.isPresent
  //        ? " individual1-individual2"
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
