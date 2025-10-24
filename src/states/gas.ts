import { GasConfig } from "@/config";
import { EntityType } from "@/enums";
import { SingleValueState } from "./state";
import { localize } from "@/localize/localize";

export class GasState extends SingleValueState {
  config?: GasConfig;
  state: number;

  public constructor(config: GasConfig | undefined) {
    super(
      config,
      EntityType.Gas,
      localize("editor.gas"),
      "mdi:fire"
    );

    this.config = config;
    this.state = 0;
  }
}
