import { HomeAssistant } from "custom-card-helpers";
import { BasicEntity, FossilFuelConfigEntity } from "../config";
import { EntityType } from "../enums";
import { Entity } from "./entity";

export class FossilFuelEntity extends Entity {
  entity?: BasicEntity;
  state: number;
  color?: string | number[];
  colorValue?: boolean;
  colorIcon?: boolean;
  decimals?: number;
  state_type?: 'percentage' | 'energy';
  displayZero?: boolean;

  public constructor(hass: HomeAssistant, fossilFuel: FossilFuelConfigEntity | undefined) {
    super(
      hass,
      fossilFuel,
      EntityType.LowCarbon,
      Array.isArray(fossilFuel?.entity)
        ? fossilFuel?.entity[0]
        : fossilFuel?.entity,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.low_carbon"),
      "mdi:leaf"
    );

    this.entity = fossilFuel?.entity;
    this.state = 0;
    this.color = fossilFuel?.color;
    this.colorValue = fossilFuel?.color_value;
    this.colorIcon = fossilFuel?.color_icon;
    this.state_type = fossilFuel?.state_type;
    this.displayZero = fossilFuel?.display_zero;
  }
}
