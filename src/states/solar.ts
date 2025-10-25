import { localize } from "@/localize/localize";
import { SolarConfig } from "@/config";
import { EntityType } from "@/enums";
import { SingleValueState } from "./state";

export class SolarState extends SingleValueState {
  config?: SolarConfig;

  state: {
    import: number;
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
      import: 0
    };
  }
}
