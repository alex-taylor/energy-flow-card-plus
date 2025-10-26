import { localize } from "@/localize/localize";
import { ColourOptions, EntitiesOptions, HomeConfig } from "@/config";
import { ColourMode } from "@/enums";
import { ValueState } from "./state";
import { HomeAssistant } from "custom-card-helpers";

export class HomeState extends ValueState {
  state: {
    fromSolar: number;
    fromGrid: number;
    fromBattery: number;
  };

  colorIcon?: ColourMode;

  public constructor(hass: HomeAssistant, config: HomeConfig | undefined) {
    super(
      hass,
      config,
      undefined,
      localize("editor.home"),
      "mdi:home"
    );

    this.state = {
      fromSolar: 0,
      fromGrid: 0,
      fromBattery: 0
    };

    this.colorIcon = config?.[EntitiesOptions.Colours]?.[ColourOptions.Icon];
  }
}
