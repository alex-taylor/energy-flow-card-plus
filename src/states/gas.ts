import { HomeAssistant } from "custom-card-helpers";
import { GasConfig } from "@/config";
import { EntityType } from "@/enums";
import { SingleValueState } from "./state";

export class GasState extends SingleValueState {
  config?: GasConfig;
  state: number;

  public constructor(hass: HomeAssistant, config: GasConfig | undefined, type: EntityType, defaultName: string, defaultIcon: string) {
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
