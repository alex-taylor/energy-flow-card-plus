import { localize } from "@/localize/localize";
import { LowCarbonConfig } from "@/config";
import { ValueState } from "./state";
import { HomeAssistant } from "custom-card-helpers";
import { getCo2SignalEntity } from "@/config/config";

export class LowCarbonState extends ValueState {
  config?: LowCarbonConfig;

  public constructor(hass: HomeAssistant, config: LowCarbonConfig | undefined) {
    super(
      hass,
      config,
      [getCo2SignalEntity(hass)],
      localize("editor.low_carbon"),
      "mdi:leaf"
    );

    this.config = config;
  }
}
