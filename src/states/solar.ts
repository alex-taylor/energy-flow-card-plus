import { localize } from "@/localize/localize";
import { SolarConfig } from "@/config";
import { EntityType } from "@/enums";
import { SingleValueState } from "./state";

export class SolarState extends SingleValueState {
  config?: SolarConfig;

  state: {
    total: number;
    toHome: number;
    toGrid: number;
    toBattery: number;
  };

  public constructor(config: SolarConfig | undefined) {
    super(
      config,
      EntityType.Solar,
      localize("editor.solar"),
      "mdi:solar-power"
    );

    this.config = config;

    this.state = {
      total: 0,
      toHome: 0,
      toGrid: 0,
      toBattery: 0
    };
  }
}
