import { HomeAssistant } from "custom-card-helpers";
import { html, TemplateResult } from "lit";
import { ComboEntity, SecondaryInfoEntity } from "./types";
import { EntitiesConfig } from "./energy-flow-card-plus-config";

export class GridEntity {
  isPresent: boolean;
  name: string;
  icon: string;
  display_zero_tolerance?: number;
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
    icon_type?: string | boolean;
    circle_type?: boolean | "production" | "consumption";
  };

  public constructor(hass: HomeAssistant, entities: EntitiesConfig) {
    const grid = entities.grid;
    this.isPresent = grid?.entity !== undefined;
    this.name = grid?.name || hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.grid");
    this.icon = grid?.icon || "mdi:transmission-tower";
    this.display_zero_tolerance = grid?.display_zero_tolerance;
    this.hasReturnToGrid = !!grid?.entity.production;

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
      consumption: grid?.entity.consumption as string,
      production: grid?.entity.production as string
    };

    this.secondary = {
      isPresent: grid?.secondary_info !== undefined,
      entity: grid?.secondary_info?.entity,
      template: grid?.secondary_info?.template,
      state: 0,
      icon: grid?.secondary_info?.icon,
      unit: grid?.secondary_info?.unit_of_measurement,
      unit_white_space: grid?.secondary_info?.unit_white_space,
      decimals: grid?.secondary_info?.decimals,
      energyDateSelection: grid?.secondary_info?.energy_date_selection || false,
      color_type: grid?.secondary_info?.color_value
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
      icon_type: grid?.color_icon,
      circle_type: grid?.color_circle
    };
  }
};

