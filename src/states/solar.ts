import { HomeAssistant } from "custom-card-helpers";
import { SolarConfig } from "../config";
import { EntityType } from "../enums";
import { SingleValueState, State } from "./state";

export class SolarState extends SingleValueState {
  config?: SolarConfig;

  state: {
    total: number;
    toHome: number;
    toGrid: number;
    toBattery: number;
  };

  public constructor(hass: HomeAssistant, config: SolarConfig | undefined) {
    super(
      config,
      EntityType.Solar,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.solar"),
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
