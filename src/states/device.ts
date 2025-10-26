import { DeviceConfig, OverridesOptions } from "@/config";
import { HomeAssistant } from "custom-card-helpers";
import { localize } from "@/localize/localize";
import { SingleValueState } from "./state";

export class DeviceState extends SingleValueState {
  config?: DeviceConfig;
  state: number;

  public constructor(hass: HomeAssistant, config: DeviceConfig | undefined) {
    super(
      hass,
      config,
      config?.[OverridesOptions.Name] || localize("common.new_device"),
      config?.[OverridesOptions.Icon] || "mdi:devices"
    );

    this.config = config;
    this.state = 0;
  }
}
