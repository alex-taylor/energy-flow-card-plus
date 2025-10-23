import { HomeAssistant } from "custom-card-helpers";
import { LowCarbonConfig } from "@/config";
import { EntityType } from "@/enums";
import { SingleValueState } from "./state";

export class LowCarbonState extends SingleValueState {
  config?: LowCarbonConfig;
  state: number;

  public constructor(hass: HomeAssistant, config: LowCarbonConfig | undefined) {
    super(
      config,
      EntityType.LowCarbon,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.low_carbon"),
      "mdi:leaf"
    );

    this.config = config;
    this.state = 0;
  }
}
