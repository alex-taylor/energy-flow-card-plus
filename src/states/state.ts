import { DualValueNodeConfig, EntitiesOptions, EntityOptions, NodeConfig, OverridesOptions, SingleValueNodeConfig } from "@/config";
import { HomeAssistant } from "custom-card-helpers";
import { filterPrimaryEntities, State } from ".";
import { SecondaryInfoState } from "./secondary-info";

export abstract class ValueState extends State {
  public name: string;
  public secondary: SecondaryInfoState;

  protected constructor(hass: HomeAssistant, config: NodeConfig | undefined, importEntities: string[] = [], defaultName: string, defaultIcon: string) {
    super(hass, config, importEntities, defaultIcon);
    this.name = config?.[EntitiesOptions.Overrides]?.[OverridesOptions.Name] || defaultName;
    this.secondary = new SecondaryInfoState(hass, config?.[EntitiesOptions.Secondary_Info]);
  }
}

export abstract class SingleValueState extends ValueState {
  protected constructor(hass: HomeAssistant, config: SingleValueNodeConfig | undefined, defaultName: string, defaultIcon: string) {
    super(
      hass,
      config,
      filterPrimaryEntities(hass, config?.[EntitiesOptions.Entities]?.[EntityOptions.Entity_Ids]),
      defaultName,
      defaultIcon);
  }
}

export abstract class DualValueState extends ValueState {
  public returnEntities?: string[]
  public firstReturnEntity?: string;

  protected constructor(hass: HomeAssistant, config: DualValueNodeConfig | undefined, defaultName: string, defaultIcon: string) {
    super(
      hass,
      config,
      filterPrimaryEntities(hass, !config?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]?.length
        ? !config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]?.length
          ? []
          : config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]
        : config?.[EntitiesOptions.Import_Entities]?.[EntityOptions.Entity_Ids]),
      defaultName,
      defaultIcon);

    this.returnEntities = filterPrimaryEntities(hass, config?.[EntitiesOptions.Export_Entities]?.[EntityOptions.Entity_Ids]);
    this.firstReturnEntity = this.returnEntities.length !== 0 ? this.returnEntities[0] : undefined;
  }
}
