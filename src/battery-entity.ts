import { HomeAssistant } from "custom-card-helpers";
import { ComboEntity } from "./types";
import { EntitiesConfig } from "./energy-flow-card-plus-config";

export class BatteryEntity {
  isPresent: boolean;
  name: string;
  icon?: string;
  display_zero_tolerance?: number;
  mainEntity?: string;
  entity: ComboEntity;

  state_of_charge: {
    state: number;
    unit: string;
    unit_white_space: boolean;
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
    icon_type?: string | boolean;
    circle_type?: boolean | "production" | "consumption";
    state_of_charge_type?: boolean | "production" | "consumption";
  };

  public constructor(hass: HomeAssistant, entities: EntitiesConfig) {
    const battery = entities.battery;
    this.isPresent = battery?.entity !== undefined;
    this.name = battery?.name || hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.battery");
    this.icon = battery?.icon || "mdi:battery-high";
    this.display_zero_tolerance = battery?.display_zero_tolerance;
    this.mainEntity = typeof battery?.entity === "object" ? battery.entity.consumption : battery?.entity;

    this.entity = {
      consumption: battery?.entity.consumption as string,
      production: battery?.entity.production as string
    };

    this.state_of_charge = {
      state: 0,
      unit: battery?.state_of_charge_unit || "%",
      unit_white_space: battery?.state_of_charge_unit_white_space || true,
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
      icon_type: battery?.color_icon,
      circle_type: battery?.color_circle,
      state_of_charge_type: battery?.color_state_of_charge_value
    };
  }
};
