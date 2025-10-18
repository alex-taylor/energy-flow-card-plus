import { SecondaryInfoConfig } from "../config";

export class SecondaryInfoEntity {
  config?: SecondaryInfoConfig;
  isPresent: boolean;
  state: string | number | null;
  icon?: string;

  public constructor(config: SecondaryInfoConfig | undefined) {
    this.config = config;
    this.isPresent = config?.entities?.entity_ids?.length !== 0 && config?.template !== undefined;
    this.state = 0;

    // TODO: initialise icon
  }
};
