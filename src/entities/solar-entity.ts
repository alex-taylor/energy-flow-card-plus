import { HomeAssistant } from "custom-card-helpers";
import { SolarConfigEntity } from "../config";
import { SecondaryInfoEntity } from "./secondary-info-entity";

export class SolarEntity {
  isPresent: boolean;
  name: string;
  icon: string;
  displayZeroTolernace?: number;
  mainEntity?: string;
  entity: string;
  secondary: SecondaryInfoEntity;

  state: {
    total: number;
    toHome: number;
    toGrid: number;
    toBattery: number;
  };

  public constructor(hass: HomeAssistant, solar: SolarConfigEntity | undefined) {
    this.isPresent = solar?.entity !== undefined;
    this.name = solar?.name || hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.solar");
    this.icon = solar?.icon || "mdi:solar-power";
    this.displayZeroTolernace = solar?.display_zero_tolerance;
    this.mainEntity = Array.isArray(solar?.entity) ? solar?.entity[0] : solar?.entity;
    this.entity = solar?.entity as string;

    this.secondary = {
      isPresent: solar?.secondary_info !== undefined,
      entity: solar?.secondary_info?.entity,
      template: solar?.secondary_info?.template,
      state: 0,
      icon: solar?.secondary_info?.icon,
      unit: solar?.secondary_info?.unit_of_measurement,
      decimals: solar?.secondary_info?.decimals,
      colorType: solar?.secondary_info?.color_of_value
    };

    this.state = {
      total: 0,
      toHome: 0,
      toGrid: 0,
      toBattery: 0
    };
  }
}
