import { EntitiesOptions, EntityOptions, SecondaryInfoConfig, SecondaryInfoOptions } from "@/config";
import { HomeAssistant } from "custom-card-helpers";
import { filterSecondaryEntities, State } from ".";

export class SecondaryInfoState extends State {
  config?: SecondaryInfoConfig;
  state: number;
  units?: string;

  public constructor(hass: HomeAssistant, config: SecondaryInfoConfig | undefined) {
    super(hass,
      config,
      filterSecondaryEntities(hass, config?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]),
      config?.[SecondaryInfoOptions.Icon] || ""
    );

    this.config = config;
    this.state = 0;
  }
}
