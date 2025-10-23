import { EntitiesOptions, EntityOptions, SecondaryInfoConfig, SecondaryInfoOptions } from "@/config";

export class SecondaryInfoState {
  config?: SecondaryInfoConfig;
  isPresent: boolean;
  state: string | number | null;
  icon?: string;

  public constructor(config: SecondaryInfoConfig | undefined) {
    this.config = config;
    this.isPresent = config?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length !== 0 || config?.[SecondaryInfoOptions.Template] !== undefined;
    this.state = 0;

    // TODO: initialise icon
  }
};
