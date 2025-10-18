import { HomeAssistant } from "custom-card-helpers";
import { HomeConfig } from "../config";
import { ColourMode, EntityType } from "../enums";
import { State } from "./state";

export class HomeState extends State {
  state: number;
  colorIcon?: ColourMode;

  public constructor(hass: HomeAssistant, config: HomeConfig | undefined) {
    super(
      config,
      EntityType.Home,
      undefined,
      hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.home"),
      "mdi:home"
    );

    this.state = 0;
    this.colorIcon = config?.colours?.colour_of_icon;
  }
}
