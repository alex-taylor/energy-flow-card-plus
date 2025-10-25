import { localize } from "@/localize/localize";
import { html, TemplateResult } from "lit";
import { EntitiesOptions, GridConfig, PowerOutageConfig, PowerOutageOptions } from "@/config";
import { EntityType } from "@/enums";
import { DualValueState } from "./state";

export class GridState extends DualValueState {
  config?: GridConfig;

  state: {
    import: number;
    export: number;
    highCarbon: number;
    fromBattery: number;
    fromSolar: number;
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
      import: 0,
      export: 0,
      highCarbon: 0,
      fromBattery: 0,
      fromSolar: 0
    };

    const powerOutageConfig: PowerOutageConfig | undefined = config?.[PowerOutageOptions.Power_Outage];

    this.powerOutage = {
      isPresent: powerOutageConfig?.[EntitiesOptions.Single_Entity] !== undefined,
      // TODO
      isOutage: false,//powerOutageConfig?.[EntitiesOptions.Single_Entity] !== undefined && hass.states[powerOutageConfig?.[EntitiesOptions.Single_Entity]]?.state === (powerOutageConfig?.[PowerOutageOptions.State_Alert] ?? "on"),
      icon: powerOutageConfig?.[PowerOutageOptions.Icon_Alert] || "mdi:transmission-tower-off",
      // TODO localize this
      name: powerOutageConfig?.[PowerOutageOptions.Label_Alert] ?? html`Power<br />Outage`
    };
  }
};
