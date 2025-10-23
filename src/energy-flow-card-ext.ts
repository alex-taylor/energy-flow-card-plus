import { html, LitElement, PropertyValues, svg, TemplateResult } from "lit";
import { formatNumber, HomeAssistant, round } from "custom-card-helpers";
import { Decimal } from "decimal.js";
import { customElement, property, state } from "lit/decorators.js";
import { getDefaultConfig, cleanupConfig } from "@/config/config";
import { getEnergyDataCollection } from "@/energy";
import { SubscribeMixin } from "@/energy/subscribe-mixin";
import localize from "@/localize/localize";
import { styles } from "@/style";
import { BatteryState } from "./states/battery";
import { GridState } from "./states/grid";
import { SolarState } from "./states/solar";
import { SecondaryInfoState } from "./states/secondary-info";
import { coerceNumber, isNumberValue, mapRange } from "@/utils";
import { registerCustomCard } from "./utils/register-custom-card";
import { Flows, calculateStatisticsFlows, getLiveDeltas } from "@/flows";
import { entityExists, getEntityStateWattHours, toWattHours } from "@/states";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { addDays, addHours, differenceInDays, endOfDay, getHours, startOfDay } from 'date-fns';
import { ColourMode, DisplayMode, DotsMode, EntityType, LowCarbonType, InactiveLinesMode, EntityMode } from "@/enums";
import { HomeState } from "@/states/home";
import { LowCarbonState } from "./states/low-carbon";
import { State } from "@/states/state";
import { EDITOR_ELEMENT_NAME } from "@/ui-editor/ui-editor";
import { CARD_NAME } from "@/const";
import { EnergyFlowCardExtConfig, EntityConfig, AppearanceOptions, EditorPages, EntitiesOptions, EntityOptions, GlobalOptions, FlowsOptions, ColourOptions, EnergyUnitsOptions, PowerOutageOptions, OverridesOptions } from "@/config";
import { logDebug } from "./logging";
import { EnergyCollection, EnergyData, Statistics, StatisticValue } from "@/hass";
import { renderDot, renderLine } from "./ui-helpers";
import { DeviceState } from "./states/device";
import { GasState } from "./states/gas";

registerCustomCard({
  type: CARD_NAME,
  name: "Energy Flow Card Extended",
  description: "A custom card for displaying energy flow in Home Assistant. Inspired by the official Energy Distribution Card and Energy Flow Card Plus.",
});

const ENERGY_DATA_TIMEOUT: number = 10000;
const CIRCLE_CIRCUMFERENCE: number = 238.76104;
const DOT_SIZE_STANDARD: number = 1;
const DOT_SIZE_INDIVIDUAL: number = 2.4;

@customElement(CARD_NAME)
export default class EnergyFlowCardPlus extends SubscribeMixin(LitElement) {
  static styles = styles;

  public static getStubConfig(hass: HomeAssistant): Record<string, unknown> {
    return getDefaultConfig(hass);
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    await import("@/ui-editor/ui-editor");
    return document.createElement(EDITOR_ELEMENT_NAME);
  }

  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: EnergyFlowCardExtConfig;
  @state() private _primaryEntities: string[] = [];
  @state() private _secondaryEntities: string[] = [];
  @state() private _error?: Error;
  @state() private _energyData?: EnergyData;
  @state() private _width = 0;
  @state() private _statistics?: Statistics;
  @state() private _loading: boolean = false;

  private _batteryState!: BatteryState;
  private _deviceStates!: DeviceState[];
  private _gasState!: GasState;
  private _gridState!: GridState;
  private _homeState!: HomeState;
  private _lowCarbonState!: LowCarbonState;
  private _solarState!: SolarState;
  private _previousDur: { [name: string]: number } = {};
  private _entityModes: Map<string, EntityMode> = new Map();

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    this._inferEntityModes();
    this._initStates(this._config);
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
        if (!this._error && !this._statistics) {
          this._error = new Error("No energy data received.");
          console.debug(getEnergyDataCollection(this.hass));
        }
      },
      ENERGY_DATA_TIMEOUT * 2);

    energyPromise.catch((err) => this._error = err);

    return [
      energyPromise.then(async (collection: EnergyCollection) => {
        return collection.subscribe(async (data: EnergyData) => {
          console.log("Received stats @ " + new Date());

          this._loading = true;
          this._energyData = data;

          if (this._primaryEntities || this._secondaryEntities) {
            let periodStart: Date;
            let periodEnd: Date;

            if (this._config?.[GlobalOptions.Display_Mode] === DisplayMode.Today) {
              periodEnd = new Date();
              periodStart = startOfDay(periodEnd);
            } else {
              periodStart = data.start;
              periodEnd = data.end ?? new Date();
            }

            const period = this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Use_Hourly_Stats] || differenceInDays(periodEnd, periodStart) <= 2 ? 'hour' : 'day';
            this._statistics = await this._getStatistics(periodStart, periodEnd, period);
            calculateStatisticsFlows(this.hass, this._statistics, this._solarState, this._batteryState, this._gridState);
          }

          this._loading = false;
        });
      }),
    ];
  }

  public setConfig(config: EnergyFlowCardExtConfig): void {
    if (typeof config !== "object") {
      throw new Error(localize("common.invalid_configuration"));
    }

    if (!config.battery?.import_entities?.entity_ids?.length && !config.battery?.export_entities?.entity_ids?.length && !config.grid?.import_entities?.entity_ids?.length && !config.grid?.export_entities?.entity_ids?.length && !config.solar?.entities?.entity_ids?.length) {
      throw new Error("At least one entity for battery, grid or solar must be defined");
    }

    this._config = cleanupConfig(this.hass, config);
    this._populateEntityArrays();
    this.resetSubscriptions();
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (this._loading) {
      return html`<ha-card style="padding: 2rem">${this.hass.localize("ui.panel.lovelace.cards.energy.loading")}</ha-card>`;
    }

    if (!this._energyData && this._config?.[GlobalOptions.Display_Mode] !== DisplayMode.Today) {
      return html`<ha-card style="padding: 2rem">
        ${this.hass.localize("ui.panel.lovelace.cards.energy.loading")}<br />Make sure you have the Energy Integration setup and a Date Selector in this View or set
        <pre>display_mode: live</pre>
        </ha-card>`;
    }

    // show pointer if clickable entities is enabled
    this.style.setProperty("--clickable-cursor", this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Clickable_Entities] ? "pointer" : "default");

    const grid: GridState = this._gridState;
    const solar: SolarState = this._solarState;
    const battery: BatteryState = this._batteryState;
    //const individual1: DeviceState = this._individual1;
    //const individual2: DeviceState = this._individual2;
    const fossilFuel: LowCarbonState = this._lowCarbonState;

    // Override in case of Power Outage
    if (grid.powerOutage.isOutage && grid.powerOutage.icon) {
      grid.icon = grid.powerOutage.icon;
    }

    // Update and Set Color of Grid Icon
    this.style.setProperty(
      "--icon-grid-color",
      grid.config?.colours?.colour_of_icon === ColourMode.Import
        ? "var(--energy-grid-consumption-color)"
        : grid.config?.colours?.colour_of_icon === ColourMode.Export
          ? "var(--energy-grid-return-color)"
          : grid.config?.colours?.colour_of_icon === ColourMode.Largest_Value
            ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Grid Secondary
    this.style.setProperty(
      "--secondary-text-grid-color",
      grid.config?.colours?.colour_of_values
        ? grid.config?.colours?.colour_of_circle === ColourMode.Import
          ? "var(--energy-grid-consumption-color)"
          : grid.config?.colours?.colour_of_circle === ColourMode.Export
            ? "var(--energy-grid-return-color)"
            : grid.config?.colours?.colour_of_circle === ColourMode.Largest_Value
              ? grid.state.fromGrid >= (grid.state.toGrid ?? 0)
                ? "var(--energy-grid-consumption-color)"
                : "var(--energy-grid-return-color)"
              : "var(--primary-text-color)"
        : "var(--primary-text-color)"
    );

    // Update and Set Color of Grid Circle
    this.style.setProperty(
      "--circle-grid-color",
      grid.config?.colours?.colour_of_circle === ColourMode.Import
        ? "var(--energy-grid-consumption-color)"
        : grid.config?.colours?.colour_of_circle === ColourMode.Export
          ? "var(--energy-grid-return-color)"
          : grid.config?.colours?.colour_of_circle === ColourMode.Largest_Value
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

    this.style.setProperty("--icon-solar-color", solar?.config?.colours?.colour_of_icon ? "var(--energy-solar-color)" : "var(--primary-text-color)");

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

    if (this._statistics && (this._config?.[GlobalOptions.Display_Mode] === DisplayMode.Today || this._config?.[GlobalOptions.Display_Mode] === DisplayMode.Hybrid && this._energyData?.start && this._energyData?.end)) {
      let start: Date;
      let end: Date;

      if (this._config?.[GlobalOptions.Display_Mode] === DisplayMode.Hybrid) {
        start = this._energyData!.start;
        end = this._energyData!.end!;
      } else {
        end = endOfDay(new Date());
        start = startOfDay(end);
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
    const entity: string | undefined = grid?.config?.import_entities?.entity_ids ? grid.config.import_entities.entity_ids[0] : undefined;

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

      if (this._config?.[GlobalOptions.Display_Mode] !== DisplayMode.History) {
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

    // Update and Set Color of Battery Icon
    this.style.setProperty(
      "--icon-battery-color",
      battery.config?.colours?.colour_of_icon === ColourMode.Import
        ? "var(--energy-battery-in-color)"
        : battery.config?.colours?.colour_of_icon === ColourMode.Export
          ? "var(--energy-battery-out-color)"
          : battery.config?.colours?.colour_of_icon === ColourMode.Largest_Value
            ? batteryFromBattery >= batteryToBattery
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)"
            : "var(--primary-text-color)"
    );

    // Update and Set Color of Battery Circle
    this.style.setProperty(
      "--circle-battery-color",
      battery.config?.colours?.colour_of_circle === ColourMode.Import
        ? "var(--energy-battery-in-color)"
        : battery.config?.colours?.colour_of_circle === ColourMode.Export
          ? "var(--energy-battery-out-color)"
          : battery.config?.colours?.colour_of_circle === ColourMode.Largest_Value
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
      batteryToGrid: this._circleRate(batteryToGrid ?? 0, totalLines),
      batteryToHome: this._circleRate(batteryToHome ?? 0, totalLines),
      gridToHome: this._circleRate(gridToHome, totalLines),
      gridToBattery: this._circleRate(gridToBattery ?? 0, totalLines),
      solarToBattery: this._circleRate(solarToBattery ?? 0, totalLines),
      solarToGrid: this._circleRate(solarToGrid ?? 0, totalLines),
      solarToHome: this._circleRate(solarToHome ?? 0, totalLines),
      //individual1: this.circleRate(individual1.state ?? 0, totalIndividualConsumption),
      //individual2: this.circleRate(individual2.state ?? 0, totalIndividualConsumption),
      lowCarbon: this._circleRate(lowCarbonEnergy ?? 0, totalLines),
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

    this.style.setProperty("--icon-non-fossil-color", this._config?.[EditorPages.Low_Carbon]?.[EntitiesOptions.Colours]?.[ColourOptions.Icon] ? "var(--non-fossil-color)" : "var(--primary-text-color)" ?? "var(--non-fossil-color)");

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
      switch (this._config?.[EditorPages.Home]?.[EntitiesOptions.Colours]?.[ColourOptions.Icon]) {
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

        case ColourMode.Largest_Value:
          iconHomeColor = homeSources[homeLargestSource].color;
          break;

        default:
          iconHomeColor = "var(--primary-text-color)";
          break;
      }

      switch (this._config?.[EditorPages.Home]?.[EntitiesOptions.Colours]?.[ColourOptions.Value]) {
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

        case ColourMode.Largest_Value:
          textHomeColor = homeSources[homeLargestSource].color;
          break;

        default:
          textHomeColor = "var(--primary-text-color)";
          break;
      }
    }

    this.style.setProperty("--icon-home-color", iconHomeColor);
    this.style.setProperty("--text-home-color", textHomeColor);
    this.style.setProperty("--text-solar-color", this._config?.[EditorPages.Solar]?.[EntitiesOptions.Colours]?.[ColourOptions.Value] ? "var(--energy-solar-color)" : "var(--primary-text-color)");
    this.style.setProperty("--text-non-fossil-color", this._config?.[EditorPages.Low_Carbon]?.[EntitiesOptions.Colours]?.[ColourOptions.Value] ? "var(--non-fossil-color)" : "var(--primary-text-color)");
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
      homeUsageToDisplay = totalHomeConsumption != 0 || this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] ? this._displayValue(totalHomeConsumption) : "";
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
      <ha-card .header=${this._config?.[GlobalOptions.Title]}>
        <div class="card-content" id=${CARD_NAME}>

        <!-- top row -->
        ${fossilFuel.isPresent || solar.isPresent// || individual1.isPresent
        ? html`
          <div class="row">

            <!-- top left -->
            ${lowCarbonEnergy == 0
            ? html`<div class="spacer"></div>`
            : html`${this._renderIndividualCircleAtTop(EntityType.LowCarbon, fossilFuel, this._config?.[EditorPages.Low_Carbon]?.[GlobalOptions.Options]?.[EntitiesOptions.Low_Carbon_Mode] === LowCarbonType.Percentage ? lowCarbonPercentage : lowCarbonEnergy, -newDur.lowCarbon)}`}

            <!-- top middle -->
            ${solar.isPresent
            ? html`${this._renderSolarCircle(solarTotal)}`
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
          ${this._renderGridCircle(gridToGrid, gridFromGrid)}

          <!-- middle right -->
          ${this._renderHomeCircle(
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
            ? html`${this._renderBatteryCircle(batteryToBattery, batteryFromBattery)}`
            : html`<div class="spacer"></div>`}

            <!-- bottom right -->
            <div class="spacer"></div>

          </div>
        `
        : html`<div class="spacer"></div>`}

        <!-- connecting lines -->
        ${this._renderSolarToHomeLine(solarToHome, newDur.solarToHome)}
        ${this._renderSolarToGridLine(solarToGrid, newDur.solarToGrid)}
        ${this._renderSolarToBatteryLine(solarToBattery, newDur.solarToBattery)}
        ${this._renderGridToHomeLine(gridToHome, newDur.gridToHome)}
        ${this._renderBatteryToHomeLine(batteryToHome, newDur.batteryToHome)}
        ${this._renderBatteryGridLine(batteryToGrid, gridToBattery, newDur.batteryToGrid, newDur.gridToBattery)}

      </div>

      <!-- dashboard link -->
      ${this._config.appearance?.options?.dashboard_link
        ? html`
          <div class="card-actions">
            <a href=${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Dashboard_Link]}>
              <mwc-button>
                ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Dashboard_Link_Label] || this.hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard")}
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

    const elem = this?.shadowRoot?.querySelector("#" + CARD_NAME);
    const widthStr = elem ? getComputedStyle(elem).getPropertyValue("width") : "0px";
    this._width = parseInt(widthStr.replace("px", ""), 10);
  }

  private _initStates = (config: EnergyFlowCardExtConfig): void => {
    this._gridState = new GridState(this.hass, config?.[EditorPages.Grid]);
    this._solarState = new SolarState(this.hass, config?.[EditorPages.Solar]);
    this._batteryState = new BatteryState(this.hass, config?.[EditorPages.Battery]);
    this._homeState = new HomeState(this.hass, config?.[EditorPages.Home]);
    //this._individual1 = new DeviceState(this.hass, entities.individual1, EntityType.Individual1, localize("card.label.car"), "mdi:car-electric");
    //this._individual2 = new DeviceState(this.hass, entities.individual2, EntityType.Individual2, localize("card.label.motorbike"), "mdi:motorbike-electric");
    this._lowCarbonState = new LowCarbonState(this.hass, config?.[EditorPages.Low_Carbon]);
  };

  private _populateEntityArrays = (): void => {
    this._primaryEntities = [];
    this._secondaryEntities = [];

    for (const pageId in EditorPages) {
      const page: any = this._config[EditorPages[pageId]];

      if (EditorPages[pageId] === EditorPages.Devices) {
        page.forEach((device, index) => {
          if (device?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length) {
            this._primaryEntities.push(...device?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]);
          }
        });
      } else {
        if (page?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._primaryEntities.push(...page?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]);
        }

        if (page?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._primaryEntities.push(...page?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]);
        }

        if (page?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._primaryEntities.push(...page?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]);
        }

        if (page?.[EntitiesOptions.Secondary_Info]?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length) {
          this._secondaryEntities.push(...page?.[EntitiesOptions.Secondary_Info]?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]);
        }
      }
    }
  };

  private async _inferEntityModes(): Promise<void> {
    const data: Statistics = await this._fetchStatistics(this.hass, addDays(startOfDay(new Date()), -1), null, [...this._primaryEntities, ...this._secondaryEntities], 'day');

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

        logDebug(CARD_NAME + ": " + entity + " is a " + mode + " sensor (change=" + firstStat.change + ", state=" + firstStat.state + ")");
        this._entityModes.set(entity, mode);
      } else {
        this._entityModes.set(entity, EntityMode.Totalising);
      }
    }
  };

  private _isMisconfiguredResettingSensor = (stat: StatisticValue): boolean => {
    const change: number = round(stat.change || 0, 6);
    let state: number = round(stat.state || 0, 6);
    return change > state || change < 0;
  };

  private _isTotalisingSensor = (stat: StatisticValue): boolean => {
    const change: number = round(stat.change || 0, 6);
    let state: number = round(stat.state || 0, 6);
    return change >= 0 && change < state;
  };





  private _getEntityStateWattHours = (entities: EntityConfig | undefined): number => getEntityStateWattHours(this.hass, this._statistics, entities);

  private _circleRate = (value: number, total: number): number => {
    const maxRate = this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Max_Rate]!;
    const minRate = this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Min_Rate]!;

    if (this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Animation] === DotsMode.Dynamic) {
      const maxEnergy = this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Max_Energy]!;
      const minEnergy = this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Min_Energy]!;
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
  private _displayValue = (value: number | string | null, unit?: string | undefined, decimals?: number | undefined): string => {
    if (value === null) {
      return "0";
    }

    if (Number.isNaN(value)) {
      return value.toString();
    }

    const valueAsNumber = new Decimal(value);
    // TODO: this is wrong, we can't apply this unless a unit is supplied
    const isMWh = (!unit || unit.toUpperCase().startsWith("MWH")) && valueAsNumber.abs().dividedBy(1000).greaterThanOrEqualTo(new Decimal(this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Energy_Units]?.[EnergyUnitsOptions.Kwh_Mwh_Threshold]!));
    const isKWh = (!unit || unit.toUpperCase().startsWith("KWH")) && valueAsNumber.abs().greaterThanOrEqualTo(new Decimal(this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Energy_Units]?.[EnergyUnitsOptions.Wh_Kwh_Threshold]!));
    const formattedValue = formatNumber(
      isMWh
        ? valueAsNumber.dividedBy(1000000).toDecimalPlaces(decimals ?? this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Energy_Units]?.[EnergyUnitsOptions.Mwh_Decimals]).toString()
        : isKWh
          ? valueAsNumber.dividedBy(1000).toDecimalPlaces(decimals ?? this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Energy_Units]?.[EnergyUnitsOptions.Kwh_Decimals]).toString()
          : valueAsNumber.toDecimalPlaces(decimals ?? this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Energy_Units]?.[EnergyUnitsOptions.Wh_Decimals]).toString(),
      this.hass.locale
    );

    return `${formattedValue}${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Unit_Whitespace] ? " " : ""}${unit ?? (isMWh ? "MWh" : isKWh ? "kWh" : "Wh")}`;
  };

  private _handleKeyDown = (target: string | undefined) => {
    if (!target) {
      return undefined;
    }

    return (e: { key: string; stopPropagation: () => void }) => {
      if (e.key === "Enter") {
        e.stopPropagation();
        this._openDetails(e, target);
      }
    };

  };

  private _handleClick = (target: string | undefined) => {
    if (!target) {
      return undefined;
    }

    return (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      this._openDetails(e, target);
    };
  };

  private _openDetails = (event: { stopPropagation: any; key?: string }, entityId?: string | undefined): void => {
    event.stopPropagation();

    if (!entityId || !this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Clickable_Entities]) {
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
  private _showLine = (energy: number): boolean => this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Inactive_Lines] === InactiveLinesMode.Normal || energy > 0;

  /**
   * Convert a an array of values in the format [r, g, b] to a hex color.
   * @param colorList - array of values in the format [r, g, b]
   * @returns hex color
   * @example
   * convertColorListToHex([255, 255, 255]) // returns #ffffff
   * convertColorListToHex([0, 0, 0]) // returns #000000
   */
  private _convertColorListToHex = (colorList: number[]): string => "#".concat(colorList.map((x) => x.toString(16).padStart(2, "0")).join(""));

  private getSecondaryState = (entity: SecondaryInfoState, type: EntityType): string | number | null => {
    if (entity.isPresent) {
      const secondaryEntity: EntityConfig = entity?.config?.entities!;
      // TODO: wrong function to call here, need a new one for secondaries
      const secondaryState = this._getEntityStateWattHours(secondaryEntity);

      if (typeof secondaryState === "number") {
        return secondaryState;
      }

      if (typeof secondaryState === "string") {
        return secondaryState;
      }
    }

    return null;
  };

  private _renderSecondarySpan = (secondary: SecondaryInfoState, type: EntityType): TemplateResult => {
    if (!secondary.isPresent || !secondary.config?.entities?.entity_ids?.length) {
      return html``;
    }

    const entity: string = secondary.config?.entities.entity_ids[0];
    let state: string | number | null = this.getSecondaryState(secondary, type);

    state = isNumberValue(secondary) && Math.abs(coerceNumber(state)) < (secondary.config.entities.zero_threshold ?? 0)
      ? 0
      : state;

    if (secondary) {
      return html`
        <span class="secondary-info ${type}" @click=${this._handleClick(entity)} @keyDown=${(this._handleKeyDown(entity))}>
          ${secondary.icon ? html`<ha-icon class="secondary-info small" .icon=${secondary.icon}></ha-icon>` : ""}
          ${secondary.config.template ?? this._displayValue(state, secondary.config.entities.units, secondary.config.entities.decimals)}
        </span>
      `;
    }

    return html``;
  };

  private _renderHomeCircle = (
    homeSolarCircumference: number,
    homeBatteryCircumference: number,
    homeLowCarbonCircumference: number,
    homeHighCarbonCircumference: number,
    homeConsumptionError: boolean,
    homeValueIsZero: boolean,
    homeUsageToDisplay: string
  ): TemplateResult => {
    const home: HomeState = this._homeState;

    return html`
      <div class="circle-container home">
        <div class="circle" id = "home-circle" @click=${this._handleClick(home.mainEntity)} @keyDown=${this._handleKeyDown(home.mainEntity)}>
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
          ${this._renderSecondarySpan(home.secondary, EntityType.HomeSecondary)}
          <ha-icon class="entity-icon" .icon=${home.icon}></ha-icon>
          ${homeUsageToDisplay}
        </div>

        <span class="label">${home.name}</span>
      </div>
    `;
  };

  private _renderGridCircle = (gridToGrid: number, gridFromGrid: number): TemplateResult => {
    const gridIcon: string =
      this._gridState.powerOutage.isOutage
        ? this._config?.[EditorPages.Grid]?.[PowerOutageOptions.Power_Outage]?.[PowerOutageOptions.Icon_Alert] ?? "mdi:transmission-tower-off"
        : this._gridState.icon;

    return html`
      ${this._gridState.isPresent
        ? html`
        <div class="circle-container grid">
          <div class="circle" @click=${this._handleClick(this._gridState.mainEntity)} @keyDown=${this._handleKeyDown(this._gridState.mainEntity)}>
          ${this._renderSecondarySpan(this._gridState.secondary, EntityType.Grid_Secondary)}
          <ha-icon class="entity-icon" .icon=${gridIcon}></ha-icon>
          ${!this._gridState.powerOutage.isOutage && (this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || gridToGrid != 0)
            ? html`
            <span class="return" @click=${this._handleClick(this._gridState.returnEntity)} @keyDown=${this._handleKeyDown(this._gridState.returnEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-left"}></ha-icon>
              ${this._displayValue(gridToGrid)}
            </span>
            `
            : null}
            ${!this._gridState.powerOutage.isOutage && (this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || gridFromGrid != 0)
            ? html`
            <span class="consumption">
              <ha-icon class="small" .icon=${"mdi:arrow-right"}></ha-icon>
              ${this._displayValue(gridFromGrid)}
            </span>`
            : ""}
            ${this._gridState.powerOutage.isOutage
            ? html`
            <span style="padding-top: 2px;" class="grid power-outage">${this._config?.[EditorPages.Grid]?.[PowerOutageOptions.Power_Outage]?.[PowerOutageOptions.Label_Alert] || html`Power<br/>Outage`}</span>`
            : ""}
          </div>
          <span class="label">${this._gridState.name}</span>
        </div>
        `
        : html`
        <div class="spacer"></div>
        `
      }
    `;
  };

  private _renderSolarCircle = (solarTotal: number): TemplateResult => {
    return html`
      <div class="circle-container solar">
        <span class="label">${this._solarState.name}</span>
        <div class="circle" @click=${this._handleClick(this._solarState.mainEntity)} @keyDown=${this._handleKeyDown(this._solarState.mainEntity)}}>
          ${this._renderSecondarySpan(this._solarState.secondary, EntityType.Solar_Secondary)}
          <ha-icon class="entity-icon" id="solar-icon" .icon=${this._solarState.icon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || solarTotal != 0 ? html`<span class="solar">${this._displayValue(solarTotal)}</span>` : ""}
        </div>
      </div>
    `;
  };

  private _renderBatteryCircle = (batteryToBattery: number, batteryFromBattery: number): TemplateResult => {
    const batteryConfig = this._config?.[EditorPages.Battery];
    let batteryIcon = "mdi:battery-high";

    if (batteryConfig?.[EntitiesOptions.Overrides]?.[OverridesOptions.Icon]) {
      batteryIcon = batteryConfig?.[EntitiesOptions.Overrides]?.[OverridesOptions.Icon];
    }

    return html`
      <div class="circle-container battery">
        <div class="circle" @click=${this._handleClick(this._batteryState.mainEntity)} @keyDown=${this._handleKeyDown(this._batteryState.mainEntity)}>
          <ha-icon class="entity-icon" .icon=${batteryIcon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || batteryToBattery != 0
        ? html`
            <span class="battery-in" style="padding-top: 2px;" @click=${this._handleClick(this._batteryState.returnEntity)} @keyDown=${this._handleKeyDown(this._batteryState.returnEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-down"}></ha-icon>
              ${this._displayValue(batteryToBattery)}
            </span>
            `
        : ""}

          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || batteryFromBattery != 0
        ? html`
            <span class="battery-out" style="padding-top: 2px;" @click=${this._handleClick(this._batteryState.mainEntity)} @keyDown=${this._handleKeyDown(this._batteryState.mainEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-up"}></ha-icon>
              ${this._displayValue(batteryFromBattery)}
            </span>
            `
        : ""}
        </div>
        <span class="label">${this._batteryState.name}</span>
      </div>
    `;
  };

  private _renderIndividualCircleAtTop = (type: EntityType, entity: State, state: number, animDuration: number): TemplateResult => {
    return html`
      <div class="circle-container ${type}">
        <span class="label">${entity.name}</span>
        <div class="circle" @click=${this._handleClick(entity.mainEntity)} @keyDown=${this._handleKeyDown(entity.mainEntity)}>
          ${this._renderSecondarySpan(entity.secondary, type)}
          <ha-icon class="entity-icon" .icon=${entity.icon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || state != 0 ? html`<span class=" ${type}">${this._displayValue(state)}</span>` : ""}
        </div>
        ${this._showLine(state)
        ? html`
          <svg width="80" height="30">
            ${renderLine(type, "M40 30 V-30")}
            ${state != 0 ? html`${renderDot(DOT_SIZE_INDIVIDUAL, type, Math.abs(animDuration), animDuration < 0)}` : ""}
          </svg>
        `
        : ""}
      </div>
    `;
  };

  private _renderIndividualCircleAtBottom = (type: EntityType, entity: State, state: number, animDuration: number): TemplateResult => {
    return html`
      <div class="circle-container ${type}">
        ${this._showLine(state)
        ? html`
          <svg width="80" height="30">
            ${renderLine(type, "M40 0 V30")}
            ${state != 0 ? html`${renderDot(DOT_SIZE_INDIVIDUAL, type, Math.abs(animDuration), animDuration < 0)}` : ""}
          </svg>
        `
        : ""}
        <div class="circle" @click=${this._handleClick(entity.mainEntity)} @keyDown=${this._handleKeyDown(entity.mainEntity)}>
          ${this._renderSecondarySpan(entity.secondary, type)}
          <ha-icon class="entity-icon" .icon=${entity.icon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || state != 0 ? html`<span class=" ${type}">${this._displayValue(state)}</span>` : ""}
        </div>
        <span class="label">${entity.name}</span>
      </div>
    `;
  };

  private _renderSolarToHomeLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M${this._batteryState.isPresent ? 55 : 53},0 v${this._gridState.isPresent ? 15 : 17} c0,${this._batteryState.isPresent ? "30 10,30 30,30" : "35 10,35 30,35"} h25`;

    return html`
      ${this._solarState.isPresent && this._showLine(value ?? 0)
        ? html`
        <div class=${this._getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-home-flow">
            ${renderLine("solar", path)}
            ${value != 0 ? html`${renderDot(DOT_SIZE_STANDARD, "solar", animDuration)}` : ""}
          </svg>
        </div>
        `
        : ""
      }
    `;
  };

  private _renderSolarToGridLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M${this._batteryState.isPresent ? 45 : 47},0 v15 c0,${this._batteryState.isPresent ? "30 -10,30 -30,30" : "35 -10,35 -30,35"} h-20`;

    return html`
      ${this._gridState.returnEntity && this._solarState.isPresent && this._showLine(value ?? 0)
        ? html`
        <div class=${this._getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-grid-flow">
            ${renderLine("return", path)}
            ${value != 0 ? html`${renderDot(DOT_SIZE_STANDARD, "return", animDuration)}` : ""}
          </svg>
        </div>
        `
        : ""}
    `;
  };

  private _renderSolarToBatteryLine = (value: number, animDuration: number): TemplateResult => {
    return html`
      ${this._batteryState.isPresent && this._solarState.isPresent && this._showLine(value ?? 0)
        ? html`
        <div class=${this._getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="solar-battery-flow" class="flat-line">
            ${renderLine("battery-solar", "M50,0 V100")}
            ${value != 0 ? html`${renderDot(DOT_SIZE_STANDARD, "battery-solar", animDuration)}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private _renderGridToHomeLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M0,${this._batteryState.isPresent ? 50 : this._solarState.isPresent ? 56 : 53} H100`;

    return html`
      ${this._gridState.isPresent && this._showLine(value)
        ? html`
        <div class=${this._getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="grid-home-flow" class="flat-line">
            ${renderLine("grid", path)}
            ${value != 0 ? html`${renderDot(DOT_SIZE_STANDARD, "grid", animDuration)}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private _renderBatteryToHomeLine = (batteryToHome: number, animDuration: number): TemplateResult => {
    const path: string = `M55,100 v-${this._gridState.isPresent ? 15 : 17} c0,-30 10,-30 30,-30 h20`;

    return html`
      ${this._batteryState.isPresent && this._showLine(batteryToHome)
        ? html`
        <div class=${this._getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="battery-home-flow">
            ${renderLine("battery-home", path)}
            ${batteryToHome != 0 ? html`${renderDot(DOT_SIZE_STANDARD, "battery-home", animDuration)}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private _renderBatteryGridLine = (batteryToGrid: number, gridToBattery: number, animDurationBatteryToGrid: number, animDurationGridToBattery: number): TemplateResult => {
    const cssClass: string = gridToBattery ? "battery-from-grid " : "" + batteryToGrid ? "battery-to-grid" : "";

    return html`
      ${this._gridState.isPresent && this._batteryState.isPresent && this._showLine(Math.max(gridToBattery, batteryToGrid))
        ? html`
        <div class=${this._getLineCssClasses()}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" id="battery-grid-flow">
            ${renderLine("battery-grid", "M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20", cssClass)}
            ${gridToBattery != 0 ? html`${renderDot(DOT_SIZE_STANDARD, "battery-from-grid", animDurationGridToBattery, true, "battery-grid")}` : ""}
            ${batteryToGrid != 0 ? html`${renderDot(DOT_SIZE_STANDARD, "battery-to-grid", animDurationBatteryToGrid, false, "battery-grid")}` : ""}
          </svg>
        </div>`
        : ""}
      `;
  };

  private _getLineCssClasses = (): string => {
    return "lines" +
      (this._batteryState.isPresent
        ? " high"
        //        : this._individual1.isPresent && this._individual2.isPresent
        //        ? " individual1-individual2"
        : "");
  };

  private async _getStatistics(periodStart: Date, periodEnd: Date, period: '5minute' | 'hour' | 'day' | 'week' | 'month'): Promise<Statistics> {
    const [previousPrimaryData, primaryData, previousSecondaryData, secondaryData]: Statistics[] = await Promise.all([
      this._fetchStatistics(this.hass, addHours(periodStart, -1), periodStart, this._primaryEntities, 'hour'),
      this._fetchStatistics(this.hass, periodStart, periodEnd, this._primaryEntities, period),
      this._fetchStatistics(this.hass, addHours(periodStart, -1), periodStart, this._secondaryEntities, 'day'),
      this._fetchStatistics(this.hass, periodStart, periodEnd, this._secondaryEntities, 'day')
    ]);

    this._primaryEntities.forEach(entity => {
      //delete data[entity];
      let statsForEntity: StatisticValue[] = primaryData[entity];
      let idx: number = 0;

      if (!statsForEntity || statsForEntity.length == 0 || statsForEntity[0].start > periodStart.getTime()) {
        let dummyStat: StatisticValue;

        if (previousPrimaryData && previousPrimaryData[entity]?.length) {
          // This entry is the final stat prior to the period we are interested in.  It is only needed for the case where we need to calculate the
          // Live/Hybrid-mode state-delta at midnight on the current date (ie, before the first stat of the new day has been generated) so we do
          // not want to include its values in the stats calculations.
          const previousStat: StatisticValue = previousPrimaryData[entity][0];

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
          primaryData[entity] = statsForEntity;
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

    return primaryData;
  }

  private _fetchStatistics = (hass: HomeAssistant, startTime: Date, endTime?: Date | null, statistic_ids?: string[], period: '5minute' | 'hour' | 'day' | 'week' | 'month' = 'hour') => hass.callWS<Statistics>({
    type: 'recorder/statistics_during_period',
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString(),
    statistic_ids: statistic_ids,
    period: period
  });
}
