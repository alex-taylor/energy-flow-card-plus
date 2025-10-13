import { HomeAssistant } from "custom-card-helpers";
import { BasicEntity, IndividualConfigEntity } from "../config";
import { EntityType } from "../enums";
import { Entity } from "./entity";

export class IndividualEntity extends Entity {
  entity?: BasicEntity;
  displayZero?: boolean;
  state: number;
  unit?: string;
  decimals?: number;
  invertAnimation?: boolean;
  showDirection?: boolean;
  color?: string | number[];

  public constructor(hass: HomeAssistant, individual: IndividualConfigEntity | undefined, type: EntityType, defaultName: string, defaultIcon: string) {
    super(
      hass,
      individual,
      type,
      Array.isArray(individual?.entity)
        ? individual?.entity[0]
        : (individual?.entity as string | undefined),
      defaultName,
      defaultIcon
    );

    this.entity = individual?.entity;
    this.displayZero = individual?.display_zero;
    this.state = 0;
    this.invertAnimation = individual?.inverted_animation;
    this.showDirection = individual?.show_direction;
    this.color = individual?.color;
  }
}
