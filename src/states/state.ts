import { DualValueNodeConfig, EntitiesOptions, EntityOptions, NodeConfig, OverridesOptions, SingleValueNodeConfig } from "@/config";
import { EntityType } from "@/enums";
import { SecondaryInfoState } from "./secondary-info";

export abstract class State {
  isPresent: boolean;
  name: string;
  icon: string;
  secondary: SecondaryInfoState;
  mainEntity?: string;
  type: EntityType;

  protected constructor(config: NodeConfig | undefined, type: EntityType, mainEntity: string | undefined, defaultName: string, defaultIcon: string) {
    this.isPresent = mainEntity !== undefined;
    this.name = config?.[EntitiesOptions.Overrides]?.[OverridesOptions.Name] || defaultName;
    this.icon = config?.[EntitiesOptions.Overrides]?.[OverridesOptions.Icon] || defaultIcon;
    this.secondary = new SecondaryInfoState(config?.[EntitiesOptions.Secondary_Info]);
    this.mainEntity = mainEntity;
    this.type = type;
  }
}

export abstract class SingleValueState extends State {
  protected constructor(config: SingleValueNodeConfig | undefined, type: EntityType, defaultName: string, defaultIcon: string) {
    super(
      config,
      type,
      !config?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]?.length
        ? undefined
        : config?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids][0],
      defaultName,
      defaultIcon);
  }
};

export abstract class DualValueState extends State {
  returnEntity?: string;

  protected constructor(config: DualValueNodeConfig | undefined, type: EntityType, defaultName: string, defaultIcon: string) {
    super(
      config,
      type,
      !config?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]?.length
        ? !config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]?.length
          ? undefined
          : config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids][0]
        : config?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids][0],
      defaultName,
      defaultIcon);

    if (config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]?.length) {
      this.returnEntity = config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids][0];
    }
  }
}
