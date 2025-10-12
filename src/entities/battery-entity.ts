import { HomeAssistant } from "custom-card-helpers";
import { BatteryConfigEntity, ComboEntity } from "../config";
import { ColorMode } from "../enums";
import { Entity } from "./entity";

export class BatteryEntity extends Entity {
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
    super(
      hass,
      battery,
      typeof battery?.entity === "object"
        ? battery.entity.consumption
        : battery?.entity,
      "ui.panel.lovelace.cards.energy.energy_distribution.battery",
      "mdi:battery-high"
    );

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
