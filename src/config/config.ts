import { ColourMode, DisplayMode, DotsMode, LowCarbonType, InactiveLinesMode, UnitDisplayMode, DeviceType } from "@/enums";
import { HomeAssistant } from 'custom-card-helpers';
import { AppearanceConfig, BatteryConfig, DeviceConfig, EnergyFlowCardExtConfig, GasConfig, GridConfig, HomeConfig, LowCarbonConfig, OverridesOptions, SolarConfig } from ".";
import { CARD_NAME } from "@/const";
import { AppearanceOptions, ColourOptions, EditorPages, EnergyUnitsOptions, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions } from "@/config";
import localize from "@/localize/localize";
import { EnergyCollection, EnergySource, getEnergyDataCollection } from "../energy";
import { HassEntity } from "home-assistant-js-websocket";
import equal from 'fast-deep-equal';

const defaultValues = {
  // EnergyUnits
  watthourDecimals: 0,
  kilowatthourDecimals: 1,
  megawatthourDecimals: 1,
  whkWhThreshold: 1000,
  kwhMwhThreshold: 1000,

  // Flows
  minRate: 1,
  maxRate: 6,
  minEnergy: 10,
  maxEnergy: 2000
};

type EntityCategory = "config" | "diagnostic";

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  entity_category?: EntityCategory;
  translation_key?: string;
  platform?: string;
  display_precision?: number;
  has_entity_name?: boolean;
};

export function getDefaultConfig(hass: HomeAssistant): EnergyFlowCardExtConfig {
  return {
    type: 'custom:' + CARD_NAME,
    // TODO: could detect the present of a date-picker?  not much point going to 'history' mode without one
    [GlobalOptions.Display_Mode]: DisplayMode.History,
    [EditorPages.Appearance]: getDefaultAppearanceConfig(),
    [EditorPages.Battery]: getDefaultBatteryConfig(hass, true),
    [EditorPages.Gas]: getDefaultGasConfig(hass, true),
    [EditorPages.Grid]: getDefaultGridConfig(hass, true),
    [EditorPages.Home]: getDefaultHomeConfig(hass),
    [EditorPages.Low_Carbon]: getDefaultLowCarbonConfig(hass, true),
    [EditorPages.Solar]: getDefaultSolarConfig(hass, true)
  };
}

export function cleanupConfig(hass: HomeAssistant, config: EnergyFlowCardExtConfig): void {
  pruneConfig(config);
//  updateConfig(config, EditorPages.Battery, getDefaultBatteryConfig(hass, false));
//  updateConfig(config, EditorPages.Gas, getDefaultGasConfig(hass, false));
//  updateConfig(config, EditorPages.Grid, getDefaultGridConfig(hass, false));
  updateConfig(config, EditorPages.Low_Carbon, getDefaultLowCarbonConfig(hass, false));
//  updateConfig(config, EditorPages.Solar, getDefaultSolarConfig(hass, false));
}

function pruneConfig(config: any): void {
  Object.keys(config).forEach(key => {
    if (config[key] === null || config[key] === undefined) {
      delete config[key];
    } else if (Array.isArray(config[key])) {
      const array: any[] = config[key];

      array.forEach((entry, index) => {
        if (entry === null || entry === undefined) {
          array.splice(index, 1);
        }
      });

      if (array.length === 0) {
        delete config[key];
      }
    } else if (typeof config[key] === "object") {
      pruneConfig(config[key]);

      if (Object.keys(config[key]).length === 0) {
        delete config[key];
      }
    }
  });
}

function updateConfig(config: any, key: string | number, defaultConfig: any): any {
  if (!config[key]) {
    return;
  }

  if (equal(config[key], defaultConfig)) {
    delete config[key];
    return;
  }

  setDefaultsRecursively(config[key], defaultConfig);
  config[key] = defaultConfig;
}

function setDefaultsRecursively(config: any, defaultConfig: any): void {
  Object.keys(defaultConfig).forEach(key => {
    const currentNode: any = config[key];

    if (currentNode) {
      if (Array.isArray(currentNode)) {
        defaultConfig[key] = currentNode;
      } else {
        const defaultNode: any = defaultConfig[key];

        if (typeof defaultNode === "object") {
          Object.keys(currentNode).forEach(childKey => {
            defaultNode[childKey] = currentNode[childKey];
          });

          setDefaultsRecursively(currentNode, defaultNode);
        }
      }
    }
  });
}

export function getDefaultAppearanceConfig(): AppearanceConfig {
  return {
    [GlobalOptions.Options]: {
      [AppearanceOptions.Inactive_Lines]: InactiveLinesMode.Normal,
      [AppearanceOptions.Show_Zero_States]: true,
      [AppearanceOptions.Unit_Whitespace]: true,
    },
    [AppearanceOptions.Energy_Units]: {
      [EnergyUnitsOptions.Wh_Decimals]: defaultValues.watthourDecimals,
      [EnergyUnitsOptions.Kwh_Decimals]: defaultValues.kilowatthourDecimals,
      [EnergyUnitsOptions.Mwh_Decimals]: defaultValues.megawatthourDecimals,
      [EnergyUnitsOptions.Wh_Kwh_Threshold]: defaultValues.whkWhThreshold,
      [EnergyUnitsOptions.Kwh_Mwh_Threshold]: defaultValues.kwhMwhThreshold
    },
    [AppearanceOptions.Flows]: {
      [FlowsOptions.Animation]: DotsMode.HASS,
      [FlowsOptions.Min_Rate]: defaultValues.minRate,
      [FlowsOptions.Max_Rate]: defaultValues.maxRate,
      [FlowsOptions.Min_Energy]: defaultValues.minEnergy,
      [FlowsOptions.Max_Energy]: defaultValues.maxEnergy
    }
  };
}

export function getDefaultGridConfig(hass: HomeAssistant, requireEntity: boolean): GridConfig | undefined {
  if (requireEntity) {
    return undefined;
  }

  return {
    [EntitiesOptions.Import_Entities]: {
      units_mode: UnitDisplayMode.After
    },
    [EntitiesOptions.Export_Entities]: {
      units_mode: UnitDisplayMode.After
    },
    [EntitiesOptions.Colours]: {
      [ColourOptions.Circle]: ColourMode.Largest_Value,
      [ColourOptions.Values]: ColourMode.Default,
      [ColourOptions.Icon]: ColourMode.Do_Not_Colour
    },
    [EntitiesOptions.Secondary_Info]: {
      [EntitiesOptions.Entities]: {
        units_mode: UnitDisplayMode.After
      }
    }
  };
}

export function getDefaultBatteryConfig(hass: HomeAssistant, requireEntity: boolean): BatteryConfig | undefined {
  if (requireEntity) {
    return undefined;
  }

  return {
    [EntitiesOptions.Import_Entities]: {
      [EntityOptions.Units_Mode]: UnitDisplayMode.After
    },
    [EntitiesOptions.Export_Entities]: {
      [EntityOptions.Units_Mode]: UnitDisplayMode.After
    },
    [EntitiesOptions.Colours]: {
      [ColourOptions.Circle]: ColourMode.Largest_Value,
      [ColourOptions.Values]: ColourMode.Default,
      [ColourOptions.Icon]: ColourMode.Do_Not_Colour
    },
    [EntitiesOptions.Secondary_Info]: {
      [EntitiesOptions.Entities]: {
        units_mode: UnitDisplayMode.After
      }
    }
  };
}

export function getDefaultSolarConfig(hass: HomeAssistant, requireEntity: boolean): SolarConfig | undefined {
  const config: SolarConfig = {
    [EntitiesOptions.Entities]: {
      [EntityOptions.Units_Mode]: UnitDisplayMode.After
    },
    [EntitiesOptions.Colours]: {
      [ColourOptions.Circle]: ColourMode.Default,
      [ColourOptions.Value]: ColourMode.Do_Not_Colour,
      [ColourOptions.Icon]: ColourMode.Do_Not_Colour
    },
    [EntitiesOptions.Secondary_Info]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
      }
    }
  };

  if (!requireEntity) {
    return config;
  }

  const energyDataCollection: EnergyCollection | null = getEnergyDataCollection(hass);
  const sources: EnergySource[] | undefined = energyDataCollection?.prefs?.energy_sources;
  const energySources: string[] = sources?.filter(source => source.type === "solar").map(source => source.stat_energy_from!) || [];

  if (energySources.length !== 0) {
    config[EntitiesOptions.Entities]![EntityOptions.Entity_Ids] = energySources;
    return config;
  }

  return undefined;
}

export function getDefaultGasConfig(hass: HomeAssistant, requireEntity: boolean): GasConfig | undefined {
  const config: GasConfig = {
    [EntitiesOptions.Entities]: {
      [EntityOptions.Units_Mode]: UnitDisplayMode.After
    },
    [EntitiesOptions.Colours]: {
      [ColourOptions.Circle]: ColourMode.Default,
      [ColourOptions.Value]: ColourMode.Do_Not_Colour,
      [ColourOptions.Icon]: ColourMode.Do_Not_Colour
    },
    [EntitiesOptions.Secondary_Info]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
      }
    }
  };

  if (!requireEntity) {
    return config;
  }

  const energyDataCollection: EnergyCollection | null = getEnergyDataCollection(hass);
  const sources: EnergySource[] | undefined = energyDataCollection?.prefs?.energy_sources;
  const energySources: string[] = sources?.filter(source => source.type === "gas").map(source => source.stat_energy_from!) || [];

  if (energySources.length !== 0) {
    config[EntitiesOptions.Entities]![EntityOptions.Entity_Ids] = energySources;
    return config;
  }

  return undefined;
}

export function getDefaultHomeConfig(hass: HomeAssistant): HomeConfig {
  return {
    [EntitiesOptions.Colours]: {
      [ColourOptions.Circle]: ColourMode.Consumption_Sources,
      [ColourOptions.Value]: ColourMode.Do_Not_Colour,
      [ColourOptions.Icon]: ColourMode.Do_Not_Colour
    }
  };
}

export function getDefaultLowCarbonConfig(hass: HomeAssistant, requireEntity: boolean): LowCarbonConfig | undefined {
  const config: LowCarbonConfig = {
    [EntitiesOptions.Entities]: {
      [EntityOptions.Units_Mode]: UnitDisplayMode.After
    },
    [EntitiesOptions.Colours]: {
      [ColourOptions.Circle]: ColourMode.Default,
      [ColourOptions.Value]: ColourMode.Do_Not_Colour,
      [ColourOptions.Icon]: ColourMode.Default
    },
    [GlobalOptions.Options]: {
      [EntitiesOptions.Low_Carbon_Mode]: LowCarbonType.Energy
    },
    [EntitiesOptions.Secondary_Info]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
      }
    }
  };

  if (!requireEntity) {
    return config;
  }

  const co2SignalEntity: string | undefined = getCo2SignalEntity(hass);

  if (co2SignalEntity) {
    config[EntitiesOptions.Entities] = {
      [EntityOptions.Entity_Ids]: [co2SignalEntity],
      [EntityOptions.Units_Mode]: UnitDisplayMode.After
    };

    return config;
  }

  return undefined;
}

export function getDefaultDeviceConfig(): DeviceConfig {
  return {
    [EntitiesOptions.Entities]: {
      [EntityOptions.Units_Mode]: UnitDisplayMode.After
    },
    [EntitiesOptions.Colours]: {
      [ColourOptions.Circle]: ColourMode.Default,
      [ColourOptions.Value]: ColourMode.Do_Not_Colour,
      [ColourOptions.Icon]: ColourMode.Do_Not_Colour
    },
    [GlobalOptions.Options]: {
      [EntitiesOptions.Device_Type]: DeviceType.Consumption_Electric
    },
    [EntitiesOptions.Secondary_Info]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
      }
    },
    [OverridesOptions.Name]: localize("common.new_device"),
    [OverridesOptions.Icon]: "mdi:devices"
  };
}

function getCo2SignalEntity(hass: HomeAssistant): string | undefined {
  let co2SignalEntity: string | undefined;

  for (const entity of Object.values(hass["entities"])) {
    const entry: EntityRegistryDisplayEntry = entity as EntityRegistryDisplayEntry;

    if (entry.platform !== "co2signal") {
      continue;
    }

    const co2State: HassEntity = hass.states[entry.entity_id];

    if (co2State && co2State.attributes.unit_of_measurement === "%") {
      co2SignalEntity = co2State.entity_id;
      break;
    }
  }

  return co2SignalEntity;
}
