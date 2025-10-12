import { HomeAssistant } from "custom-card-helpers";
import { SolarConfigEntity } from "../config";
import { Entity } from "./entity";

export class SolarEntity extends Entity {
  entity: string;

  state: {
    total: number;
    toHome: number;
    toGrid: number;
    toBattery: number;
  };

  public constructor(hass: HomeAssistant, solar: SolarConfigEntity | undefined) {
    super(
      hass,
      solar,
      Array.isArray(solar?.entity)
        ? solar?.entity[0]
        : solar?.entity,
      "ui.panel.lovelace.cards.energy.energy_distribution.solar",
      "mdi:solar-power"
    );

    this.entity = solar?.entity as string;

    this.state = {
      total: 0,
      toHome: 0,
      toGrid: 0,
      toBattery: 0
    };
  }
}
