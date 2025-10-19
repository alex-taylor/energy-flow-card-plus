import { ColourMode, DisplayMode, DotsMode, LowCarbonType, InactiveLinesMode, UnitDisplayMode } from "@/enums";
import { HomeAssistant } from 'custom-card-helpers';
import { EnergyFlowCardExtConfig } from ".";
import { CARD_NAME } from "@/const";
import { AppearanceOptions, ColourOptions, EditorPages, EnergyUnitsOptions, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions } from "@/ui-editor/schema";

const defaultValues = {
  displayMode: DisplayMode.Today,

  // Appearance
  inactiveLines: InactiveLinesMode.Normal,
  showZeroStates: true,
  clickableEntities: true,
  unitWhiteSpace: true,

  // EnergyUnits
  watthourDecimals: 0,
  kilowatthourDecimals: 1,
  megawatthourDecimals: 1,
  whkWhThreshold: 1000,
  kwhMwhThreshold: 1000,

  // Entities
  unitsMode: UnitDisplayMode.After,

  // Flows
  minRate: 1,
  maxRate: 6,
  minEnergy: 10,
  maxEnergy: 2000,
  dotsMode: DotsMode.Dynamic
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

  return {
    type: 'custom:' + CARD_NAME,
    [GlobalOptions.Display_Mode]: defaultValues.displayMode,

    [EditorPages.Appearance]: {
      [GlobalOptions.Options]: {
        [AppearanceOptions.Inactive_Lines]: defaultValues.inactiveLines,
        [AppearanceOptions.Show_Zero_States]: defaultValues.showZeroStates,
        [AppearanceOptions.Clickable_Entities]: defaultValues.clickableEntities,
        [AppearanceOptions.Unit_Whitespace]: defaultValues.unitWhiteSpace,
      },
      [AppearanceOptions.Energy_Units]: {
        [EnergyUnitsOptions.Wh_Decimals]: defaultValues.watthourDecimals,
        [EnergyUnitsOptions.Kwh_Decimals]: defaultValues.kilowatthourDecimals,
        [EnergyUnitsOptions.Mwh_Decimals]: defaultValues.megawatthourDecimals,
        [EnergyUnitsOptions.Wh_Kwh_Threshold]: defaultValues.whkWhThreshold,
        [EnergyUnitsOptions.Kwh_Mwh_Threshold]: defaultValues.kwhMwhThreshold
      },
      [AppearanceOptions.Flows]: {
        [FlowsOptions.Animation]: defaultValues.dotsMode,
        [FlowsOptions.Min_Rate]: defaultValues.minRate,
        [FlowsOptions.Max_Rate]: defaultValues.maxRate,
        [FlowsOptions.Min_Energy]: defaultValues.minEnergy,
        [FlowsOptions.Max_Energy]: defaultValues.maxEnergy
      }
    },

    [EditorPages.Grid]: {
      [EntitiesOptions.Import_Entities]: {
        units_mode: defaultValues.unitsMode
        // TODO: this is clearly not correct!
        //entity_ids: gridEnergyEntities
      },
      [EntitiesOptions.Export_Entities]: {
        units_mode: defaultValues.unitsMode
        //entity_ids: gridEnergyEntities
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour,
        [ColourOptions.Circle]: ColourMode.Auto,
        [ColourOptions.Values]: ColourMode.Auto
      },
      [EntitiesOptions.Secondary_Info]: {
        [EntitiesOptions.Entities]: {
          units_mode: defaultValues.unitsMode
        }
      }
    },

    [EditorPages.Gas]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: defaultValues.unitsMode
        // TODO: entities
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour,
        [ColourOptions.Circle]: ColourMode.Auto,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour
      }
    },

    [EditorPages.Low_Carbon]: {
      [EntitiesOptions.Colours]: {
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour,
        [ColourOptions.Circle]: ColourMode.Auto,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour
      },
      [GlobalOptions.Options]: {
        [EntitiesOptions.Low_Carbon_Mode]: LowCarbonType.Energy
      }
    },

    [EditorPages.Solar]: {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Units_Mode]: defaultValues.unitsMode
        // TODO: handle multiple entities
        //entity_ids: [firstSolarEnergyEntity]
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour,
        [ColourOptions.Circle]: ColourMode.Auto,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour
      }
    },

    [EditorPages.Battery]: {
      [EntitiesOptions.Import_Entities]: {
        [EntityOptions.Units_Mode]: defaultValues.unitsMode
        // TODO: this is clearly not correct!
        //entity_ids: batteryEnergyEntities
      },
      [EntitiesOptions.Export_Entities]: {
        [EntityOptions.Units_Mode]: defaultValues.unitsMode
        //entity_ids: batteryEnergyEntities
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour,
        [ColourOptions.Circle]: ColourMode.Auto,
        [ColourOptions.Values]: ColourMode.Auto
      }
    },

    [EditorPages.Home]: {
      [EntitiesOptions.Colours]: {
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour
      }
    }
  };
}
