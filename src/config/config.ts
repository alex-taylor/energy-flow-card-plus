import { ColourMode, DisplayMode, DotsMode, LowCarbonType, ZeroLinesMode } from "../enums";
import { HomeAssistant } from 'custom-card-helpers';
import { EnergyFlowCardPlusConfig } from ".";

const defaultValues = {
  displayMode: DisplayMode.Today,

  // Appearance
  displayZeroLines: ZeroLinesMode.Show,
  displayZeroState: true,
  clickableEntities: true,
  useHourlyStats: false,
  unitWhiteSpace: true,

  // EnergyUnits
  watthourDecimals: 0,
  kilowatthourDecimals: 1,
  megawatthourDecimals: 1,
  whkWhThreshold: 1000,
  kwhMwhThreshold: 1000,

  // Flows
  minFlowRate: 1,
  maxFlowRate: 6,
  minExpectedEnergy: 10,
  maxExpectedEnergy: 2000,
  dotsMode: DotsMode.Dynamic
};

export function getDefaultConfig(hass: HomeAssistant): EnergyFlowCardPlusConfig {
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
    type: 'custom:energy-flow-card-plus',
    display_mode: defaultValues.displayMode,

    appearance: {
      display_zero_lines: {
        mode: defaultValues.displayZeroLines,
      },
      display_zero_state: defaultValues.displayZeroState,
      clickable_entities: defaultValues.clickableEntities,
      use_hourly_stats: defaultValues.useHourlyStats,
      unit_white_space: defaultValues.unitWhiteSpace,

      energy_units: {
        wh_decimals: defaultValues.watthourDecimals,
        kwh_decimals: defaultValues.kilowatthourDecimals,
        wh_kwh_threshold: defaultValues.whkWhThreshold,
        kwh_mwh_threshold: defaultValues.kwhMwhThreshold
      },

      flows: {
        min_flow_rate: defaultValues.minFlowRate,
        max_flow_rate: defaultValues.maxFlowRate,
        max_expected_energy: defaultValues.maxExpectedEnergy,
        min_expected_energy: defaultValues.minExpectedEnergy,
        mode: defaultValues.dotsMode
      }
    },

    grid: {
      // TODO: this is clearly not correct!
      consumption_entities: {
        entity_ids: gridEnergyEntities
      },
      production_entities: {
        entity_ids: gridEnergyEntities
      },
      colour_of_icon: ColourMode.Do_Not_Colour,
      colour_of_circle: ColourMode.Colour_Dynamically,
      colour_values: true
    },

    gas: {
      // TODO: entities
      colour_icon: false,
      colour_value: false,
      sum: false
    },

    low_carbon: {
      colour_icon: false,
      colour_value: false,
      display: LowCarbonType.Energy
    },

    solar: {
      entities: {
        // TODO: handle multiple entities
        entity_ids: [firstSolarEnergyEntity]
      },
      colour_icon: false,
      colour_value: false
    },

    battery: {
      // TODO: this is clearly not correct!
      consumption_entities: {
        entity_ids: batteryEnergyEntities
      },
      production_entities: {
        entity_ids: batteryEnergyEntities
      },
      colour_of_icon: ColourMode.Do_Not_Colour,
      colour_of_circle: ColourMode.Colour_Dynamically,
      colour_values: true
    },

    home: {
      color_of_icon: ColourMode.Do_Not_Colour,
      color_of_value: ColourMode.Colour_Dynamically      
    }
  };
}
