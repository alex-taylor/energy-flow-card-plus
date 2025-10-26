import { BatteryConfig } from "@/config";
import { DualValueState } from "./state";
import { localize } from "@/localize/localize";
import { HomeAssistant } from "custom-card-helpers";

export class BatteryState extends DualValueState {
  config?: BatteryConfig;

  state: {
    import: number;
    export: number;
    fromSolar: number;
    fromGrid: number;
  };

  public constructor(hass: HomeAssistant, config: BatteryConfig | undefined) {
    super(
      hass,
      config,
      localize("editor.battery"),
      "mdi:battery-high"
    );

    this.config = config;

    this.state = {
      import: 0,
      export: 0,
      fromSolar: 0,
      fromGrid: 0
    };
  }
};
