import { HomeAssistant } from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import { EntityConfigOptions } from "../config";
import { EntityType } from "../enums";
import { SecondaryInfoEntity } from "./secondary-info-entity";

export abstract class Entity {
  isPresent: boolean;
  name: string;
  icon: string;
  displayZeroTolerance?: number;
  secondary: SecondaryInfoEntity;
  mainEntity?: string;
  type: EntityType;

  protected constructor(hass: HomeAssistant, entity: EntityConfigOptions | undefined, type: EntityType, mainEntity: string | undefined, defaultName: string, defaultIcon: string) {
    const stateObj: HassEntity | undefined = mainEntity ? hass.states[mainEntity] : undefined;
    this.isPresent = mainEntity !== undefined;
    this.name = entity?.name || (entity?.use_metadata && stateObj?.attributes.friendly_name) || defaultName;
    this.icon = entity?.icon || (entity?.use_metadata && stateObj?.attributes.icon) || defaultIcon;
    this.displayZeroTolerance = entity?.display_zero_tolerance;
    this.secondary = new SecondaryInfoEntity(entity?.secondary_info);
    this.mainEntity = mainEntity;
    this.type = type;
  }
}
