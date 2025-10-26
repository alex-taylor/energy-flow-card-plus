import { localize } from "@/localize/localize";
import { LowCarbonConfig } from "@/config";
import { EntityType } from "@/enums";
import { State } from "./state";
import { HomeAssistant } from "custom-card-helpers";
import { getCo2SignalEntity } from "../config/config";

export class LowCarbonState extends State {
  config?: LowCarbonConfig;

  public constructor(config: LowCarbonConfig | undefined, hass: HomeAssistant) {
    super(
      config,
      EntityType.LowCarbon,
      getCo2SignalEntity(hass),
      localize("editor.low_carbon"),
      "mdi:leaf"
    );

    this.config = config;
  }
}
