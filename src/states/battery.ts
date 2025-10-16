import { HomeAssistant } from "custom-card-helpers";
import { BatteryConfig } from "../config";
import { EntityType } from "../enums";
import { DualValueState } from "./state";

export class BatteryState extends DualValueState {
  config?: BatteryConfig;

  state: {
    toBattery: number;
    fromBattery: number;
    toGrid: number;
    toHome: number;
  };

  public constructor(hass: HomeAssistant, config: BatteryConfig | undefined) {
    super(
      config,
      EntityType.Battery,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.battery"),
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
