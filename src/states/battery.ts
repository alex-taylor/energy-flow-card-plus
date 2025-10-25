import { BatteryConfig } from "@/config";
import { EntityType } from "@/enums";
import { DualValueState } from "./state";
import { localize } from "@/localize/localize";

export class BatteryState extends DualValueState {
  config?: BatteryConfig;

  state: {
    import: number;
    export: number;
    fromSolar: number;
    fromGrid: number;
  };

  public constructor(config: BatteryConfig | undefined) {
    super(
      config,
      EntityType.Battery,
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
