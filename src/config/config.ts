import { ColourMode, DisplayMode, DotsMode, LowCarbonType, InactiveLinesMode, UnitDisplayMode, DeviceType } from "@/enums";
import { HomeAssistant } from 'custom-card-helpers';
import { DeviceConfig, EnergyFlowCardExtConfig, LowCarbonConfig, OverridesOptions } from ".";
import { CARD_NAME } from "@/const";
import { AppearanceOptions, ColourOptions, EditorPages, EnergyUnitsOptions, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions } from "@/config";
import localize from "@/localize/localize";
import { EnergyCollection, getEnergyDataCollection } from "../energy";
import { HassEntities, HassEntity } from "home-assistant-js-websocket";

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
  function checkStrings(entiyId: string, testStrings: string[]): boolean {
    const friendlyName = hass.states[entiyId].attributes.friendly_name;
    return testStrings.some(str => entiyId.includes(str) || friendlyName?.includes(str));
  }

  const energyEntities = Object.keys(hass.states).filter(entityId => {
    const stateObj = hass.states[entityId];
    return (stateObj.state && stateObj.attributes && stateObj.attributes.device_class === 'energy') || stateObj.entity_id.includes('energy');
  });

  const gridEnergyTestString = ['grid', 'utility', 'net', 'meter'];
  const solarTests = ['solar', 'pv', 'photovoltaic', 'inverter'];
  const batteryTests = ['battery'];
  const batteryEnergyEntities = energyEntities.filter(entityId => checkStrings(entityId, batteryTests));
  const gridEnergyEntities = energyEntities.filter(entityId => checkStrings(entityId, gridEnergyTestString));
  const firstSolarEnergyEntity = energyEntities.filter(entityId => checkStrings(entityId, solarTests))[0];

  const energyDataCollection: EnergyCollection | null = getEnergyDataCollection(hass);


  const config: EnergyFlowCardExtConfig = {
    type: 'custom:' + CARD_NAME,
    // TODO: could detect the present of a date-picker?  not much point going to 'history' mode without one
    [GlobalOptions.Display_Mode]: DisplayMode.History,

    [EditorPages.Appearance]: {
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
    },

    [EditorPages.Grid]: {
      [EntitiesOptions.Import_Entities]: {
        units_mode: UnitDisplayMode.After
        // TODO: this is clearly not correct!
        //entity_ids: gridEnergyEntities
      },
      [EntitiesOptions.Export_Entities]: {
        units_mode: UnitDisplayMode.After
        //entity_ids: gridEnergyEntities
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
    },

    [EditorPages.Gas]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
        // TODO: entities
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Circle]: ColourMode.Default,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour,
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour
      }
    },

    [EditorPages.Low_Carbon]: {
      [EntitiesOptions.Colours]: {
        [ColourOptions.Circle]: ColourMode.Default,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour,
        [ColourOptions.Icon]: ColourMode.Default
      },
      [GlobalOptions.Options]: {
        [EntitiesOptions.Low_Carbon_Mode]: LowCarbonType.Energy
      }
    },

    [EditorPages.Solar]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
        // TODO: handle multiple entities
        //entity_ids: [firstSolarEnergyEntity]
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Circle]: ColourMode.Default,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour,
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour
      }
    },

    [EditorPages.Battery]: {
      [EntitiesOptions.Import_Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
        // TODO: this is clearly not correct!
        //entity_ids: batteryEnergyEntities
      },
      [EntitiesOptions.Export_Entities]: {
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
        //entity_ids: batteryEnergyEntities
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Circle]: ColourMode.Largest_Value,
        [ColourOptions.Values]: ColourMode.Default,
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour
      }
    },

    [EditorPages.Home]: {
      [EntitiesOptions.Colours]: {
        [ColourOptions.Circle]: ColourMode.Consumption_Sources,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour,
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour
      }
    }
  };

  config[EditorPages.Low_Carbon] = getDefaultLowCarbonConfig(hass, true);

  return config;
}

export function pruneConfig(config: any): void {
  Object.keys(config).forEach(key => {
    if (Array.isArray(config[key])) {
      const array: any[] = config[key];

      array.forEach((entry, index) => {
        if (entry === null || entry === undefined) {
          array.splice(index, 1);
        }
      });

      if (array.length === 0) {
        config[key] = undefined;
      }
    } else if (typeof config[key] === "object") {
      pruneConfig(config[key]);
    }
  });
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

  const co2SignalEntity = getCo2SignalEntity(hass);

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

export function getCo2SignalEntity(hass: HomeAssistant): string | undefined {
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
