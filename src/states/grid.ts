import { HomeAssistant } from "custom-card-helpers";
import { html, TemplateResult } from "lit";
import { GridConfig } from "../config";
import { EntityType } from "../enums";
import { DualValueState } from "./state";

export class GridState extends DualValueState {
  config?: GridConfig;

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

  public constructor(hass: HomeAssistant, config: GridConfig | undefined) {
    super(
      config,
      EntityType.Grid,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.grid"),
      "mdi:transmission-tower"
    );

    this.config = config;

    this.state = {
      fromGrid: 0,
      toGrid: 0,
      toBattery: 0,
      toHome: 0
    };

    this.powerOutage = {
      isPresent: config?.power_outage?.entity !== undefined,
      isOutage: (config?.power_outage?.entity && hass.states[config.power_outage.entity]?.state) === (config?.power_outage?.state_alert ?? "on"),
      icon: config?.power_outage?.icon_alert || "mdi:transmission-tower-off",
      name: config?.power_outage?.label_alert ?? html`Power<br />Outage`
    };
  }
};
