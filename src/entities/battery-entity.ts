import { HomeAssistant } from "custom-card-helpers";
import { BatteryConfigEntity, ComboEntity } from "../config";
import { ColorMode } from "../enums";

export class BatteryEntity {
  isPresent: boolean;
  name: string;
  icon?: string;
  displayZeroTolerance?: number;
  mainEntity?: string;
  entity: ComboEntity;

  stateOfCharge: {
    state: number;
    unit: string;
    decimals: number;
  };

  state: {
    toBattery: number;
    fromBattery: number;
    toGrid: number;
    toHome: number;
  };

  color: {
    fromBattery?: string;
    toBattery?: string;
    iconType?: ColorMode;
    circleType?: ColorMode;
    stateOfChargeType?: ColorMode;
  };

  public constructor(hass: HomeAssistant, battery: BatteryConfigEntity | undefined) {
    this.isPresent = battery?.entity !== undefined;
    this.name = battery?.name || hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.battery");
    this.icon = battery?.icon || "mdi:battery-high";
    this.displayZeroTolerance = battery?.display_zero_tolerance;
    this.mainEntity = typeof battery?.entity === "object" ? battery.entity.consumption : battery?.entity;

    this.entity = {
      consumption: battery?.entity?.consumption as string,
      production: battery?.entity?.production as string
    };

    this.stateOfCharge = {
      state: 0,
      unit: battery?.state_of_charge_unit || "%",
      decimals: battery?.state_of_charge_decimals || 0
    };

    this.state = {
      toBattery: 0,
      fromBattery: 0,
      toGrid: 0,
      toHome: 0
    };

    this.color = {
      fromBattery: battery?.color?.consumption,
      toBattery: battery?.color?.production,
      iconType: battery?.color_of_icon,
      circleType: battery?.color_of_circle,
      stateOfChargeType: battery?.color_state_of_charge_value
    };
  }
};
