import { HomeAssistant } from "custom-card-helpers";
import { html, TemplateResult } from "lit";
import { ComboEntity, GridConfigEntity } from "../config";
import { SecondaryInfoEntity } from "./secondary-info-entity";
import { ColorMode } from "../enums";

export class GridEntity {
  isPresent: boolean;
  name: string;
  icon: string;
  displayZeroTolerance?: number;
  hasReturnToGrid: boolean;
  mainEntity?: string;
  entity: ComboEntity;
  secondary: SecondaryInfoEntity;

  state: {
    fromGrid: number;
    toGrid: number;
    toBattery: number;
    toHome: number;
  };

  powerOutage: {
    isPresent: boolean;
    isOutage: boolean;
    icon?: string;
    name: string | TemplateResult<1>;
  };

  color: {
    fromGrid?: string;
    toGrid?: string;
    colorIcon?: ColorMode;
    colorCircle?: ColorMode;
  };

  public constructor(hass: HomeAssistant, grid: GridConfigEntity | undefined) {
    this.isPresent = grid?.entity !== undefined;
    this.name = grid?.name || hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.grid");
    this.icon = grid?.icon || "mdi:transmission-tower";
    this.displayZeroTolerance = grid?.display_zero_tolerance;
    this.hasReturnToGrid = !!grid?.entity?.production;

    this.mainEntity = Array.isArray(grid?.entity?.consumption)
      ? grid?.entity?.consumption[0]
      : typeof grid?.entity?.consumption === "string"
        ? grid?.entity?.consumption
        : Array.isArray(grid?.entity?.production)
          ? grid?.entity?.production[0]
          : typeof grid?.entity?.production === "string"
            ? grid?.entity?.production
            : undefined;

    this.entity = {
      consumption: grid?.entity?.consumption as string,
      production: grid?.entity?.production as string
    };

    this.secondary = {
      isPresent: grid?.secondary_info !== undefined,
      entity: grid?.secondary_info?.entity,
      template: grid?.secondary_info?.template,
      state: 0,
      icon: grid?.secondary_info?.icon,
      unit: grid?.secondary_info?.unit_of_measurement,
      decimals: grid?.secondary_info?.decimals,
      colorType: grid?.secondary_info?.color_of_value
    };

    this.state = {
      fromGrid: 0,
      toGrid: 0,
      toBattery: 0,
      toHome: 0
    };

    this.powerOutage = {
      isPresent: grid?.power_outage != undefined,
      isOutage: (grid && grid.power_outage?.entity && hass.states[grid.power_outage.entity]?.state) === (grid?.power_outage?.state_alert ?? "on"),
      icon: grid?.power_outage?.icon_alert || "mdi:transmission-tower-off",
      name: grid?.power_outage?.label_alert ?? html`Power<br />Outage`
    };

    this.color = {
      fromGrid: grid?.color?.consumption,
      toGrid: grid?.color?.production,
      colorIcon: grid?.color_of_icon,
      colorCircle: grid?.color_of_circle
    };
  }
};

