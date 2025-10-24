import { BatteryConfig } from "@/config";
import { EntityType } from "@/enums";
import { DualValueState } from "./state";
import { localize } from "@/localize/localize";

export class BatteryState extends DualValueState {
  config?: BatteryConfig;

  state: {
    toBattery: number;
    fromBattery: number;
    toGrid: number;
    toHome: number;
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
      toBattery: 0,
      fromBattery: 0,
      toGrid: 0,
      toHome: 0
    };
  }
};
