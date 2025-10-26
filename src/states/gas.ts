import { GasConfig } from "@/config";
import { SingleValueState } from "./state";
import { localize } from "@/localize/localize";
import { HomeAssistant } from "custom-card-helpers";

export class GasState extends SingleValueState {
  config?: GasConfig;
  state: number;

  public constructor(hass: HomeAssistant, config: GasConfig | undefined) {
    super(
      hass,
      config,
      localize("editor.gas"),
      "mdi:fire"
    );

    this.config = config;
    this.state = 0;
  }
}
