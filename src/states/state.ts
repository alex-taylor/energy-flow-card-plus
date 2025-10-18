import { DualValueNodeConfig, NodeConfig, SingleValueNodeConfig } from "../config";
import { EntityType } from "../enums";
import { SecondaryInfoEntity } from "./secondary-info";

export abstract class State {
  isPresent: boolean;
  name: string;
  icon: string;
  secondary: SecondaryInfoEntity;
  mainEntity?: string;
  type: EntityType;

  protected constructor(config: NodeConfig | undefined, type: EntityType, mainEntity: string | undefined, defaultName: string, defaultIcon: string) {
    this.isPresent = mainEntity !== undefined;
    this.name = config?.overrides?.name || defaultName;
    this.icon = config?.overrides?.icon || defaultIcon;
    this.secondary = new SecondaryInfoEntity(config?.secondary_info);
    this.mainEntity = mainEntity;
    this.type = type;
  }
}

export abstract class SingleValueState extends State {
  protected constructor(config: SingleValueNodeConfig | undefined, type: EntityType, defaultName: string, defaultIcon: string) {
    super(
      config,
      type,
      !config?.entities?.entity_ids?.length
        ? undefined
        : config.entities.entity_ids[0],
      defaultName,
      defaultIcon);
  }
};

export abstract class DualValueState extends State {
  returnEntity?: string;
  hasReturn: boolean = false;

  protected constructor(config: DualValueNodeConfig | undefined, type: EntityType, defaultName: string, defaultIcon: string) {
    super(
      config,
      type,
      !config?.import_entities?.entity_ids?.length
        ? !config?.export_entities?.entity_ids?.length
          ? undefined
          : config.export_entities.entity_ids[0]
        : config.import_entities.entity_ids[0],
      defaultName,
      defaultIcon);

    if (!config?.import_entities?.entity_ids?.length && config?.export_entities?.entity_ids?.length) {
      this.returnEntity = config.export_entities.entity_ids[0];
      this.hasReturn = true;
    }
  }
}
