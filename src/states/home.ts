import { localize } from "@/localize/localize";
import { ColourOptions, EntitiesOptions, HomeConfig } from "@/config";
import { ColourMode, EntityType } from "@/enums";
import { State } from "./state";

export class HomeState extends State {
  state: number;
  colorIcon?: ColourMode;

  public constructor(config: HomeConfig | undefined) {
    super(
      config,
      EntityType.Home,
      undefined,
      localize("editor.home"),
      "mdi:home"
    );

    this.state = 0;
    this.colorIcon = config?.[EntitiesOptions.Colours]?.[ColourOptions.Icon];
  }
}
