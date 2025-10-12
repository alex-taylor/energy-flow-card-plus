import { HomeAssistant } from "custom-card-helpers";
import { html, TemplateResult } from "lit";
import { ComboEntity, GridConfigEntity } from "../config";
import { ColorMode } from "../enums";
import { Entity } from "./entity";

export class GridEntity extends Entity {
  hasReturnToGrid: boolean;
  entity: ComboEntity;

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
    super(
      hass,
      grid,
      Array.isArray(grid?.entity?.consumption)
        ? grid?.entity?.consumption[0]
        : typeof grid?.entity?.consumption === "string"
          ? grid?.entity?.consumption
          : Array.isArray(grid?.entity?.production)
            ? grid?.entity?.production[0]
            : typeof grid?.entity?.production === "string"
              ? grid?.entity?.production
              : undefined,
      "ui.panel.lovelace.cards.energy.energy_distribution.grid",
      "mdi:transmission-tower"
    );

    this.hasReturnToGrid = !!grid?.entity?.production;

    this.entity = {
      consumption: grid?.entity?.consumption as string,
      production: grid?.entity?.production as string
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

