import { localize } from "@/localize/localize";
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

  public constructor(config: GridConfig | undefined) {
    super(
      config,
      EntityType.Grid,
      localize("editor.grid"),
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
      // TODO
      isOutage: false,//powerOutageConfig?.[EntitiesOptions.Single_Entity] !== undefined && hass.states[powerOutageConfig?.[EntitiesOptions.Single_Entity]]?.state === (powerOutageConfig?.[PowerOutageOptions.State_Alert] ?? "on"),
      icon: powerOutageConfig?.[PowerOutageOptions.Icon_Alert] || "mdi:transmission-tower-off",
      name: powerOutageConfig?.[PowerOutageOptions.Label_Alert] ?? html`Power<br />Outage`
    };
  }
};
