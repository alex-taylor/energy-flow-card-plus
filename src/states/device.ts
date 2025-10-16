import { HomeAssistant } from "custom-card-helpers";
import { DeviceConfig } from "../config";
import { EntityType } from "../enums";
import { SingleValueState } from "./state";

export class DeviceState extends SingleValueState {
  config?: DeviceConfig;
  state: number;

  public constructor(hass: HomeAssistant, config: DeviceConfig | undefined, type: EntityType, defaultName: string, defaultIcon: string) {
    super(
      config,
      type,
      defaultName,
      defaultIcon
    );

    this.config = config;
    this.state = 0;
  }
}
