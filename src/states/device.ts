import { DeviceConfig, OverridesOptions } from "@/config";
import { EntityType } from "@/enums";
import { localize } from "../localize/localize";
import { SingleValueState } from "./state";

export class DeviceState extends SingleValueState {
  config?: DeviceConfig;
  state: number;

  public constructor(config: DeviceConfig | undefined) {
    super(
      config,
      EntityType.Device,
      config?.[OverridesOptions.Name] || localize("common.new_device"),
      config?.[OverridesOptions.Icon] || "mdi:devices"
    );

    this.config = config;
    this.state = 0;
  }
}
