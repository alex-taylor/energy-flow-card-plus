import { html, LitElement, PropertyValues, svg, TemplateResult } from "lit";
import { formatNumber, HomeAssistant } from "custom-card-helpers";
import { Decimal } from "decimal.js";
import { customElement, property, state } from "lit/decorators.js";
import { getDefaultConfig, cleanupConfig } from "@/config/config";
import { SubscribeMixin } from "@/energy/subscribe-mixin";
import { localize } from "@/localize/localize";
import { styles } from "@/style";
import { BatteryState } from "@/states/battery";
import { GridState } from "@/states/grid";
import { SolarState } from "@/states/solar";
import { SecondaryInfoState } from "@/states/secondary-info";
import { coerceNumber, isNumberValue, mapRange } from "@/utils";
import { registerCustomCard } from "@/utils/register-custom-card";
import { States, Flows, SecondaryState } from "@/states";
import { EntityStates } from "@/states";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { ColourMode, DisplayMode, DotsMode, EntityType, LowCarbonType, InactiveLinesMode, UnitDisplayMode } from "@/enums";
import { HomeState } from "@/states/home";
import { LowCarbonState } from "./states/low-carbon";
import { State } from "@/states/state";
import { EDITOR_ELEMENT_NAME } from "@/ui-editor/ui-editor";
import { CARD_NAME, DEVICE_CLASS_ENERGY } from "@/const";
import { EnergyFlowCardExtConfig, AppearanceOptions, EditorPages, EntitiesOptions, GlobalOptions, FlowsOptions, ColourOptions, EnergyUnitsOptions, PowerOutageOptions, OverridesOptions, EntityOptions, EnergyUnitsConfig, EntityConfig } from "@/config";
import { renderDot, renderLine } from "@/ui-helpers";
import { GasState } from "@/states/gas";

registerCustomCard({
  type: CARD_NAME,
  name: "Energy Flow Card Extended",
  description: "A custom card for displaying energy flow in Home Assistant. Inspired by the official Energy Distribution Card and Energy Flow Card Plus.",
});

const CIRCLE_CIRCUMFERENCE: number = 238.76104;
const DOT_SIZE_STANDARD: number = 1;
const DOT_SIZE_INDIVIDUAL: number = 2.4;

//================================================================================================================================================================================//

@customElement(CARD_NAME)
export default class EnergyFlowCardPlus extends SubscribeMixin(LitElement) {
  static styles = styles;

  //================================================================================================================================================================================//

  public static getStubConfig(hass: HomeAssistant): Record<string, unknown> {
    return getDefaultConfig(hass);
  }

  //================================================================================================================================================================================//

  public static async getConfigElement(): Promise<HTMLElement> {
    await import("@/ui-editor/ui-editor");
    return document.createElement(EDITOR_ELEMENT_NAME);
  }

  //================================================================================================================================================================================//

  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: EnergyFlowCardExtConfig;
  @state() private _width = 0;
  @state() private _loading: boolean = false;

  private _entityStates!: EntityStates;
  private _previousDur: { [name: string]: number } = {};

  //================================================================================================================================================================================//

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this._config || !this.hass) {
      return;
    }

    const elem = this?.shadowRoot?.querySelector("#" + CARD_NAME);
    const widthStr = elem ? getComputedStyle(elem).getPropertyValue("width") : "0px";
    this._width = parseInt(widthStr.replace("px", ""), 10);
    this._entityStates.hass = this.hass;
  }

  //================================================================================================================================================================================//

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    console.log("hassSubscribe()");
    this._entityStates = new EntityStates(this.hass, this._config);
    return [];
  }

  //================================================================================================================================================================================//

  public setConfig(config: EnergyFlowCardExtConfig): void {
    if (typeof config !== "object") {
      throw new Error(localize("common.invalid_configuration"));
    }

    if (!config?.[EditorPages.Battery]?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]?.length &&
      !config?.[EditorPages.Battery]?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids] &&
      !config?.[EditorPages.Grid]?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]?.length &&
      !config?.[EditorPages.Grid]?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]?.length &&
      !config?.[EditorPages.Solar]?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length &&
      !config?.[EditorPages.Gas]?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length) {
      throw new Error("At least one entity for battery, gas, grid or solar must be defined");
    }

    this._config = cleanupConfig(this.hass, config);
    console.log("setConfig()");
    this.resetSubscriptions();
  }

  //================================================================================================================================================================================//

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this._entityStates) {
      return html``;
    }

    if (this._loading) {
      return html`<ha-card style="padding: 2rem">${this.hass.localize("ui.panel.lovelace.cards.energy.loading")}</ha-card>`;
    }

    if (!this._entityStates.isDatePickerPresent && this._config?.[GlobalOptions.Display_Mode] !== DisplayMode.Today) {
      return html`<ha-card style="padding: 2rem">
        ${this.hass.localize("ui.panel.lovelace.cards.energy.loading")}<br />Make sure you have the Energy Integration setup and a Date Selector in this View or set
        <pre>display_mode: live</pre>
        </ha-card>`;
    }

    // show pointer if clickable entities is enabled
    this.style.setProperty("--clickable-cursor", this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Clickable_Entities] ? "pointer" : "default");

    const grid: GridState = this._entityStates.grid;
    const solar: SolarState = this._entityStates.solar;
    const battery: BatteryState = this._entityStates.battery;
    const gas: GasState = this._entityStates.gas;
    const lowCarbon: LowCarbonState = this._entityStates.lowCarbon;

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
            ? grid.state.import >= (grid.state.export ?? 0)
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
              ? grid.state.import >= (grid.state.export ?? 0)
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
            ? grid.state.import >= (grid.state.export ?? 0)
              ? "var(--energy-grid-consumption-color)"
              : "var(--energy-grid-return-color)"
            : "var(--energy-grid-consumption-color)"
    );

    this.style.setProperty("--icon-solar-color", solar?.config?.colours?.colour_of_icon ? "var(--energy-solar-color)" : "var(--primary-text-color)");

    const states: States = this._entityStates.getStates();
    const flows: Flows = states.flows;
    let totalHomeConsumption: number = states.home;
    let homeConsumptionError: boolean = false;

    if (totalHomeConsumption < 0) {
      totalHomeConsumption = 0;
      homeConsumptionError = true;
    }

    // Update and Set Color of Battery Icon
    this.style.setProperty(
      "--icon-battery-color",
      battery.config?.colours?.colour_of_icon === ColourMode.Import
        ? "var(--energy-battery-in-color)"
        : battery.config?.colours?.colour_of_icon === ColourMode.Export
          ? "var(--energy-battery-out-color)"
          : battery.config?.colours?.colour_of_icon === ColourMode.Largest_Value
            ? states.batteryImport >= states.batteryExport
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
            ? states.batteryImport >= states.batteryExport
              ? "var(--energy-battery-out-color)"
              : "var(--energy-battery-in-color)"
            : "var(--energy-battery-in-color)"
    );

    // Calculate Circumference of Semi-Circles
    // TODO: totalHomeConsumption may be zero by this point
    const homeBatteryCircumference: number = CIRCLE_CIRCUMFERENCE * (flows.batteryToHome / totalHomeConsumption);
    const homeSolarCircumference: number = CIRCLE_CIRCUMFERENCE * (flows.solarToHome / totalHomeConsumption);
    const highCarbonConsumption: number = states.highCarbon * (flows.gridToHome / states.gridImport);
    const homeHighCarbonCircumference: number = CIRCLE_CIRCUMFERENCE * (highCarbonConsumption / totalHomeConsumption);
    const homeLowCarbonCircumference: number = CIRCLE_CIRCUMFERENCE - homeSolarCircumference - homeBatteryCircumference - homeHighCarbonCircumference;

    const totalLines = flows.solarToHome + flows.solarToGrid + flows.solarToBattery + flows.gridToHome + flows.gridToBattery + flows.batteryToHome + flows.batteryToGrid;

    const newDur = {
      batteryToGrid: this._circleRate(flows.batteryToGrid ?? 0, totalLines),
      batteryToHome: this._circleRate(flows.batteryToHome ?? 0, totalLines),
      gridToHome: this._circleRate(flows.gridToHome, totalLines),
      gridToBattery: this._circleRate(flows.gridToBattery ?? 0, totalLines),
      solarToBattery: this._circleRate(flows.solarToBattery ?? 0, totalLines),
      solarToGrid: this._circleRate(flows.solarToGrid ?? 0, totalLines),
      solarToHome: this._circleRate(flows.solarToHome ?? 0, totalLines),
      lowCarbon: this._circleRate(states.lowCarbon ?? 0, totalLines),
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
        value: flows.batteryToHome,
        color: "var(--energy-battery-out-color)",
      },
      solar: {
        value: flows.solarToHome,
        color: "var(--energy-solar-color)",
      },
      grid: {
        value: flows.gridToHome,
        color: "var(--energy-grid-consumption-color)",
      },
      gridNonFossil: {
        value: states.lowCarbon,
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
    this.style.setProperty("--text-solar-color", this._config?.[EditorPages.Solar]?.[EntitiesOptions.Colours]?.[ColourOptions.Value] !== ColourMode.Do_Not_Colour ? "var(--energy-solar-color)" : "var(--primary-text-color)");
    this.style.setProperty("--text-non-fossil-color", this._config?.[EditorPages.Low_Carbon]?.[EntitiesOptions.Colours]?.[ColourOptions.Value] !== ColourMode.Do_Not_Colour ? "var(--non-fossil-color)" : "var(--primary-text-color)");
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
      homeUsageToDisplay = totalHomeConsumption != 0 || this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] ? this._displayState(undefined, totalHomeConsumption, DEVICE_CLASS_ENERGY) : "";
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
        ${lowCarbon.isPresent || solar.isPresent
        ? html`
          <div class="row">

            <!-- top left -->
            ${lowCarbon.isPresent
            // TODO need to find a way of passing the units through, otherwise energy will be treated as percentage
            ? html`${this._renderIndividualCircleAtTop(EntityType.LowCarbon, lowCarbon, this._config?.[EditorPages.Low_Carbon]?.[GlobalOptions.Options]?.[EntitiesOptions.Low_Carbon_Mode] === LowCarbonType.Percentage ? states.lowCarbonPercentage : states.lowCarbon, states.lowCarbonSecondary, - newDur.lowCarbon)}`
            : html`<div class="spacer"></div>`}

            <!-- top middle -->
            ${solar.isPresent
            ? html`${this._renderSolarCircle(states.solarImport, states.solarSecondary)}`
            : ""}

            <!-- top right -->
            <div class="spacer"></div>

        </div>
        `
        : ""}

        <!-- middle row -->
        <div class="row">

          <!-- middle left -->
          ${this._renderGridCircle(states.gridExport, states.gridImport, states.gridSecondary)}

          <!-- middle right -->
          ${this._renderHomeCircle(
          homeSolarCircumference,
          homeBatteryCircumference,
          homeLowCarbonCircumference,
          homeHighCarbonCircumference,
          homeConsumptionError,
          homeValueIsZero,
          homeUsageToDisplay,
          states.homeSecondary)}

        </div>

        <!-- bottom row -->
        ${battery.isPresent
        ? html`
          <div class="row">

            <!-- bottom left -->
            <div class="spacer"></div>

            <!-- bottom middle -->
            ${battery.isPresent
            ? html`${this._renderBatteryCircle(states.batteryExport, states.batteryImport, states.batterySecondary)}`
            : html`<div class="spacer"></div>`}

            <!-- bottom right -->
            <div class="spacer"></div>

          </div>
        `
        : html`<div class="spacer"></div>`}

        <!-- connecting lines -->
        ${this._renderSolarToHomeLine(flows.solarToHome, newDur.solarToHome)}
        ${this._renderSolarToGridLine(flows.solarToGrid, newDur.solarToGrid)}
        ${this._renderSolarToBatteryLine(flows.solarToBattery, newDur.solarToBattery)}
        ${this._renderGridToHomeLine(flows.gridToHome, newDur.gridToHome)}
        ${this._renderBatteryToHomeLine(flows.batteryToHome, newDur.batteryToHome)}
        ${this._renderBatteryGridLine(flows.batteryToGrid, flows.gridToBattery, newDur.batteryToGrid, newDur.gridToBattery)}

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

  //================================================================================================================================================================================//

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

  //================================================================================================================================================================================//

  private _displayState(entityConfig: EntityConfig | undefined, state: number | string | null, deviceClass: string | undefined = undefined): string {
    if (state === null) {
      return "0";
    }

    if (Number.isNaN(state)) {
      return state.toString();
    }

    const entityIds: string[] = entityConfig?.[EntityOptions.Entity_Ids] || [];
    let isEnergyDevice: boolean = deviceClass === DEVICE_CLASS_ENERGY;
    let units: string | undefined;

    if (entityIds?.length > 0) {
      isEnergyDevice = (deviceClass ?? this.hass.states[entityIds[0]].attributes.device_class) === DEVICE_CLASS_ENERGY;
      units = entityConfig?.[EntityOptions.Units] ?? this.hass.states[entityIds[0]].attributes.unit_of_measurement;
    }

    const energyUnitsConfig: EnergyUnitsConfig | undefined = this._config?.[EditorPages.Appearance]?.[AppearanceOptions.Energy_Units];

    let valueAsNumber = new Decimal(state);
    let decimals: number | undefined = entityConfig?.[EntityOptions.Decimals];

    if (isEnergyDevice) {
      const isMWh = (units && units.toUpperCase().startsWith("MWH")) || valueAsNumber.abs().dividedBy(1000).greaterThanOrEqualTo(new Decimal(energyUnitsConfig?.[EnergyUnitsOptions.Kwh_Mwh_Threshold]!));
      const isKWh = (units && units.toUpperCase().startsWith("KWH")) || valueAsNumber.abs().greaterThanOrEqualTo(new Decimal(energyUnitsConfig?.[EnergyUnitsOptions.Wh_Kwh_Threshold]!));

      decimals = decimals ?? isMWh
        ? energyUnitsConfig?.[EnergyUnitsOptions.Mwh_Decimals]
        : isKWh
          ? energyUnitsConfig?.[EnergyUnitsOptions.Kwh_Decimals]
          : energyUnitsConfig?.[EnergyUnitsOptions.Wh_Decimals];

      if (isMWh) {
        valueAsNumber = valueAsNumber.dividedBy(1000000);

        if (!units) {
          units = "MWh";
        }
      } else if (isKWh) {
        valueAsNumber = valueAsNumber.dividedBy(1000);

        if (!units) {
          units = "kWh";
        }
      } else if (!units) {
        units = "Wh";
      }
    } else {
      // TODO handle multiple entities
      decimals = decimals ?? entityIds.length > 0 ? this.hass["entities"][entityIds[0]].display_precision : undefined;
    }

    const formattedValue = formatNumber(valueAsNumber.toDecimalPlaces(decimals).toString(), this.hass.locale);
    const unitWhitespace: boolean = this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Unit_Whitespace]!;
    const unitPosition: UnitDisplayMode = entityConfig?.[EntityOptions.Units_Mode] || UnitDisplayMode.After;

    if (units) {
      switch (unitPosition) {
        case UnitDisplayMode.After:
          return `${formattedValue}${units && unitWhitespace ? " " : ""}${units}`;

        case UnitDisplayMode.Before:
          return `${units}${units && unitWhitespace ? " " : ""}${formattedValue}`;
      }
    }

    return `${formattedValue}`;
  }

  //================================================================================================================================================================================//

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

  //================================================================================================================================================================================//

  private _handleClick = (target: string | undefined) => {
    if (!target) {
      return undefined;
    }

    return (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      this._openDetails(e, target);
    };
  };

  //================================================================================================================================================================================//

  private _entityExists = (hass: HomeAssistant, entityId: string): boolean => entityId in hass.states;

  //================================================================================================================================================================================//

  private _openDetails = (event: { stopPropagation: any; key?: string }, entityId?: string | undefined): void => {
    event.stopPropagation();

    if (!entityId || !this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Clickable_Entities]) {
      return;
    }

    // also needs to open details if entity is unavailable, but not if entity doesn't exist in hass states
    if (!this._entityExists(this.hass, entityId)) {
      return;
    }

    const e = new CustomEvent("hass-more-info", {
      composed: true,
      detail: { entityId },
    });

    this.dispatchEvent(e);
  };

  //================================================================================================================================================================================//

  private _showLine = (energy: number): boolean => this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Inactive_Lines] === InactiveLinesMode.Normal || energy > 0;

  //================================================================================================================================================================================//

  private _convertColorListToHex = (colorList: number[]): string => "#".concat(colorList.map((x) => x.toString(16).padStart(2, "0")).join(""));

  //================================================================================================================================================================================//

  private _renderSecondarySpan(secondary: SecondaryInfoState, type: EntityType, state: SecondaryState): TemplateResult {
    if (!secondary.isPresent) {
      return html``;
    }

    const entities: string[] = secondary.config?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]!;
    const entity: string = entities[0];

    state = isNumberValue(state) && Math.abs(coerceNumber(state)) < (secondary.config?.[EntitiesOptions.Entities]?.[EntityOptions.Zero_Threshold] ?? 0)
      ? 0
      : state;

    return html`
        <span class="secondary-info ${type}" @click=${this._handleClick(entity)} @keyDown=${(this._handleKeyDown(entity))}>
          ${secondary.icon ? html`<ha-icon class="secondary-info small" .icon=${secondary.icon}></ha-icon>` : ""}
          ${secondary.config!.template ?? this._displayState(secondary.config?.[EntitiesOptions.Entities], state)}
        </span>
      `;
  };

  //================================================================================================================================================================================//

  private _renderHomeCircle = (
    homeSolarCircumference: number,
    homeBatteryCircumference: number,
    homeLowCarbonCircumference: number,
    homeHighCarbonCircumference: number,
    homeConsumptionError: boolean,
    homeValueIsZero: boolean,
    homeUsageToDisplay: string,
    homeSecondary: SecondaryState
  ): TemplateResult => {
    const home: HomeState = this._entityStates.home;

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
          ${this._renderSecondarySpan(home.secondary, EntityType.HomeSecondary, homeSecondary)}
          <ha-icon class="entity-icon" .icon=${home.icon}></ha-icon>
          ${homeUsageToDisplay}
        </div>

        <span class="label">${home.name}</span>
      </div>
    `;
  };

  //================================================================================================================================================================================//

  private _renderGridCircle(gridToGrid: number, gridFromGrid: number, secondaryState: number | string | null): TemplateResult {
    const gridIcon: string =
      this._entityStates.grid.powerOutage.isOutage
        ? this._config?.[EditorPages.Grid]?.[PowerOutageOptions.Power_Outage]?.[PowerOutageOptions.Icon_Alert] ?? "mdi:transmission-tower-off"
        : this._entityStates.grid.icon;

    return html`
      ${this._entityStates.grid.isPresent
        ? html`
        <div class="circle-container grid">
          <div class="circle" @click=${this._handleClick(this._entityStates.grid.mainEntity)} @keyDown=${this._handleKeyDown(this._entityStates.grid.mainEntity)}>
          ${this._renderSecondarySpan(this._entityStates.grid.secondary, EntityType.Grid_Secondary, secondaryState)}
          <ha-icon class="entity-icon" .icon=${gridIcon}></ha-icon>
          ${!this._entityStates.grid.powerOutage.isOutage && (this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || gridToGrid != 0)
            ? html`
            <span class="return" @click=${this._handleClick(this._entityStates.grid.returnEntity)} @keyDown=${this._handleKeyDown(this._entityStates.grid.returnEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-left"}></ha-icon>
              ${this._displayState(this._entityStates.grid.config?.[EntitiesOptions.Export_Entities], gridToGrid)}
            </span>
            `
            : null}
            ${!this._entityStates.grid.powerOutage.isOutage && (this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || gridFromGrid != 0)
            ? html`
            <span class="consumption">
              <ha-icon class="small" .icon=${"mdi:arrow-right"}></ha-icon>
              ${this._displayState(this._entityStates.grid.config?.[EntitiesOptions.Import_Entities], gridFromGrid)}
            </span>`
            : ""}
            ${this._entityStates.grid.powerOutage.isOutage
            ? html`
            <span style="padding-top: 2px;" class="grid power-outage">${this._config?.[EditorPages.Grid]?.[PowerOutageOptions.Power_Outage]?.[PowerOutageOptions.Label_Alert] || html`Power<br/>Outage`}</span>`
            : ""}
          </div>
          <span class="label">${this._entityStates.grid.name}</span>
        </div>
        `
        : html`
        <div class="spacer"></div>
        `
      }
    `;
  }

  //================================================================================================================================================================================//

  private _renderSolarCircle(solarTotal: number, secondaryState: number | string | null): TemplateResult {
    return html`
      <div class="circle-container solar">
        <span class="label">${this._entityStates.solar.name}</span>
        <div class="circle" @click=${this._handleClick(this._entityStates.solar.mainEntity)} @keyDown=${this._handleKeyDown(this._entityStates.solar.mainEntity)}}>
          ${this._renderSecondarySpan(this._entityStates.solar.secondary, EntityType.Solar_Secondary, secondaryState)}
          <ha-icon class="entity-icon" id="solar-icon" .icon=${this._entityStates.solar.icon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || solarTotal != 0 ? html`<span class="solar">${this._displayState(this._entityStates.solar.config?.[EntitiesOptions.Entities], solarTotal)}</span>` : ""}
        </div>
      </div>
    `;
  }

  //================================================================================================================================================================================//

  private _renderBatteryCircle = (batteryToBattery: number, batteryFromBattery: number, secondaryState: number | string | null): TemplateResult => {
    const batteryConfig = this._config?.[EditorPages.Battery];
    let batteryIcon = "mdi:battery-high";

    if (batteryConfig?.[EntitiesOptions.Overrides]?.[OverridesOptions.Icon]) {
      batteryIcon = batteryConfig?.[EntitiesOptions.Overrides]?.[OverridesOptions.Icon];
    }

    return html`
      <div class="circle-container battery">
        <div class="circle" @click=${this._handleClick(this._entityStates.battery.mainEntity)} @keyDown=${this._handleKeyDown(this._entityStates.battery.mainEntity)}>
          ${this._renderSecondarySpan(this._entityStates.battery.secondary, EntityType.Battery_Secondary, secondaryState)}
          <ha-icon class="entity-icon" .icon=${batteryIcon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || batteryToBattery != 0
        ? html`
            <span class="battery-in" style="padding-top: 2px;" @click=${this._handleClick(this._entityStates.battery.returnEntity)} @keyDown=${this._handleKeyDown(this._entityStates.battery.returnEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-down"}></ha-icon>
              ${this._displayState(this._entityStates.battery.config?.[EntitiesOptions.Import_Entities], batteryToBattery)}
            </span>
            `
        : ""}

          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || batteryFromBattery != 0
        ? html`
            <span class="battery-out" style="padding-top: 2px;" @click=${this._handleClick(this._entityStates.battery.mainEntity)} @keyDown=${this._handleKeyDown(this._entityStates.battery.mainEntity)}>
              <ha-icon class="small" .icon=${"mdi:arrow-up"}></ha-icon>
              ${this._displayState(this._entityStates.battery.config?.[EntitiesOptions.Export_Entities], batteryFromBattery)}
            </span>
            `
        : ""}
        </div>
        <span class="label">${this._entityStates.battery.name}</span>
      </div>
    `;
  };

  //================================================================================================================================================================================//

  private _renderIndividualCircleAtTop = (type: EntityType, entity: State, state: number, secondaryState: SecondaryState, animDuration: number): TemplateResult => {
    return html`
      <div class="circle-container ${type}">
        <span class="label">${entity.name}</span>
        <div class="circle" @click=${this._handleClick(entity.mainEntity)} @keyDown=${this._handleKeyDown(entity.mainEntity)}>
          ${this._renderSecondarySpan(entity.secondary, type, secondaryState)}
          <ha-icon class="entity-icon" .icon=${entity.icon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || state != 0 ? html`<span class=" ${type}">${this._displayState(entity.config.entities, state)}</span>` : ""}
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

  //================================================================================================================================================================================//

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
          ${this._renderSecondarySpan(entity.secondary, type, 0)}
          <ha-icon class="entity-icon" .icon=${entity.icon}></ha-icon>
          ${this._config?.[EditorPages.Appearance]?.[GlobalOptions.Options]?.[AppearanceOptions.Show_Zero_States] || state != 0 ? html`<span class=" ${type}">${this._displayState(entity.config.entities, state)}</span>` : ""}
        </div>
        <span class="label">${entity.name}</span>
      </div>
    `;
  };

  //================================================================================================================================================================================//

  private _renderSolarToHomeLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M${this._entityStates.battery.isPresent ? 55 : 53},0 v${this._entityStates.grid.isPresent ? 15 : 17} c0,${this._entityStates.battery.isPresent ? "30 10,30 30,30" : "35 10,35 30,35"} h25`;

    return html`
      ${this._entityStates.solar.isPresent && this._showLine(value ?? 0)
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

  //================================================================================================================================================================================//

  private _renderSolarToGridLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M${this._entityStates.battery.isPresent ? 45 : 47},0 v15 c0,${this._entityStates.battery.isPresent ? "30 -10,30 -30,30" : "35 -10,35 -30,35"} h-20`;

    return html`
      ${this._entityStates.grid.returnEntity && this._entityStates.solar.isPresent && this._showLine(value ?? 0)
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

  //================================================================================================================================================================================//

  private _renderSolarToBatteryLine = (value: number, animDuration: number): TemplateResult => {
    return html`
      ${this._entityStates.battery.isPresent && this._entityStates.solar.isPresent && this._showLine(value ?? 0)
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

  //================================================================================================================================================================================//

  private _renderGridToHomeLine = (value: number, animDuration: number): TemplateResult => {
    const path: string = `M0,${this._entityStates.battery.isPresent ? 50 : this._entityStates.solar.isPresent ? 56 : 53} H100`;

    return html`
      ${this._entityStates.grid.isPresent && this._showLine(value)
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

  //================================================================================================================================================================================//

  private _renderBatteryToHomeLine = (batteryToHome: number, animDuration: number): TemplateResult => {
    const path: string = `M55,100 v-${this._entityStates.grid.isPresent ? 15 : 17} c0,-30 10,-30 30,-30 h20`;

    return html`
      ${this._entityStates.battery.isPresent && this._showLine(batteryToHome)
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

  //================================================================================================================================================================================//

  private _renderBatteryGridLine = (batteryToGrid: number, gridToBattery: number, animDurationBatteryToGrid: number, animDurationGridToBattery: number): TemplateResult => {
    const cssClass: string = gridToBattery ? "battery-from-grid " : "" + batteryToGrid ? "battery-to-grid" : "";

    return html`
      ${this._entityStates.grid.isPresent && this._entityStates.battery.isPresent && this._showLine(Math.max(gridToBattery, batteryToGrid))
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

  //================================================================================================================================================================================//

  private _getLineCssClasses = (): string => {
    return "lines" +
      (this._entityStates.battery.isPresent
        ? " high"
        //        : this._individual1.isPresent && this._individual2.isPresent
        //        ? " individual1-individual2"
        : "");
  };
}
