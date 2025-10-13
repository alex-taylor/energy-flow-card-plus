import { HomeAssistant } from "custom-card-helpers";
import { BasicEntity, HomeConfigEntity } from "../config";
import { ColorMode, EntityType } from "../enums";
import { Entity } from "./entity";

export class HomeEntity extends Entity {
  entity?: BasicEntity;
  state: number;
  colorIcon?: ColorMode;

  public constructor(hass: HomeAssistant, home: HomeConfigEntity | undefined) {
    super(
      hass,
      home,
      EntityType.Home,
      Array.isArray(home?.entity)
        ? home?.entity[0]
        : home?.entity,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.home"),
      "mdi:home"
    );

    this.entity = home?.entity;
    this.state = 0;
    this.colorIcon = home?.color_of_icon;
  }
}
