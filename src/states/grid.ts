import { HomeAssistant } from "custom-card-helpers";
import { html, TemplateResult } from "lit";
import { EntitiesOptions, GridConfig, PowerOutageConfig, PowerOutageOptions } from "@/config";
import { EntityType } from "@/enums";
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

    const powerOutageConfig: PowerOutageConfig | undefined = config?.[PowerOutageOptions.Power_Outage];

    this.powerOutage = {
      isPresent: powerOutageConfig?.[EntitiesOptions.Single_Entity] !== undefined,
      isOutage: powerOutageConfig?.[EntitiesOptions.Single_Entity] !== undefined && hass.states[powerOutageConfig?.[EntitiesOptions.Single_Entity]]?.state === (powerOutageConfig?.[PowerOutageOptions.State_Alert] ?? "on"),
      icon: powerOutageConfig?.[PowerOutageOptions.Icon_Alert] || "mdi:transmission-tower-off",
      name: powerOutageConfig?.[PowerOutageOptions.Label_Alert] ?? html`Power<br />Outage`
    };
  }
};
