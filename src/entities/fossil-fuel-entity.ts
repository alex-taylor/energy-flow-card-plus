import { HomeAssistant } from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import { FossilFuelConfigEntity } from "../config";
import { Entity } from "./entity";

export class FossilFuelEntity extends Entity {
  isVisible: boolean;
  entity?: string;
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
      Array.isArray(fossilFuel?.entity)
        ? fossilFuel?.entity[0]
        : fossilFuel?.entity,
      "ui.panel.lovelace.cards.energy.energy_distribution.low_carbon",
      "mdi:leaf"
    );

    this.isVisible = fossilFuel?.show || false;
    this.entity = fossilFuel?.entity;
    this.state = 0;
    this.color = fossilFuel?.color;
    this.colorValue = fossilFuel?.color_value;
    this.colorIcon = fossilFuel?.color_icon;
    this.decimals = fossilFuel?.decimals;
    this.state_type = fossilFuel?.state_type;
    this.displayZero = fossilFuel?.display_zero;
  }
}
