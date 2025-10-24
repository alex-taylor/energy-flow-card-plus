import { localize } from "@/localize/localize";
import { LowCarbonConfig } from "@/config";
import { EntityType } from "@/enums";
import { SingleValueState } from "./state";

export class LowCarbonState extends SingleValueState {
  config?: LowCarbonConfig;
  state: number;

  public constructor(config: LowCarbonConfig | undefined) {
    super(
      config,
      EntityType.LowCarbon,
      localize("editor.low_carbon"),
      "mdi:leaf"
    );

    this.config = config;
    this.state = 0;
  }
}
