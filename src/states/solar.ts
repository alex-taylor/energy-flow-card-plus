import { localize } from "@/localize/localize";
import { SolarConfig } from "@/config";
import { SingleValueState } from "./state";
import { HomeAssistant } from "custom-card-helpers";

export class SolarState extends SingleValueState {
  config?: SolarConfig;

  state: {
    import: number;
  };

  public constructor(hass: HomeAssistant, config: SolarConfig | undefined) {
    super(
      hass,
      config,
      localize("editor.solar"),
      "mdi:solar-power"
    );

    this.config = config;

    this.state = {
      import: 0
    };
  }
}
