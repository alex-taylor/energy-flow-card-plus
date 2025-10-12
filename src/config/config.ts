import { ColorMode, DisplayMode } from "../enums";
import { HomeAssistant } from 'custom-card-helpers';
import { coerceNumber } from '../utils';
import { EnergyFlowCardPlusConfig } from ".";

const defaultValues = {
  displayMode: DisplayMode.Live,
  clickableEntities: true,
  displayZeroLines: true,
  useNewFlowRateModel: true,
  useHourlyStats: false,
  unitWhiteSpace: true,
  displayZeroState: true,
  maxFlowRate: 6,
  minFlowRate: 1,
  watthourDecimals: 0,
  kilowatthourDecimals: 1,
  megawatthourDecimals: 1,
  minExpectedEnergy: 10,
  maxExpectedEnergy: 2000,
  whkWhThreshold: 1000,
  kwhMwhThreshold: 1000,
};

export function getDefaultConfig(hass: HomeAssistant): EnergyFlowCardPlusConfig {
  function checkStrings(entiyId: string, testStrings: string[]): boolean {
    const friendlyName = hass.states[entiyId].attributes.friendly_name;
    return testStrings.some(str => entiyId.includes(str) || friendlyName?.includes(str));
  }

  const energyEntities = Object.keys(hass.states).filter(entityId => {
    const stateObj = hass.states[entityId];
    const isAvailable =
      (stateObj.state && stateObj.attributes && stateObj.attributes.device_class === 'energy') || stateObj.entity_id.includes('energy');
    return isAvailable;
  });

  const gridEnergyTestString = ['grid', 'utility', 'net', 'meter'];
  const solarTests = ['solar', 'pv', 'photovoltaic', 'inverter'];
  const batteryTests = ['battery'];
  const batteryEnergyEntities = energyEntities.filter(entityId => checkStrings(entityId, batteryTests));
  const gridEnergyEntities = energyEntities.filter(entityId => checkStrings(entityId, gridEnergyTestString));
  const firstSolarEnergyEntity = energyEntities.filter(entityId => checkStrings(entityId, solarTests))[0];

  return {
    type: 'custom:energy-flow-card-plus',
    entities: {
      battery: {
        entity: {
          consumption: batteryEnergyEntities[0] ?? '',
          production: batteryEnergyEntities[1] ?? '',
        },
      },
      grid: {
        entity: {
          consumption: gridEnergyEntities[0] ?? '',
          production: gridEnergyEntities[1] ?? '',
        },
      },
      solar: firstSolarEnergyEntity
        ? { entity: firstSolarEnergyEntity }
        : undefined,
    },
    display_mode: defaultValues.displayMode,
    clickable_entities: defaultValues.clickableEntities,
    display_zero_lines: defaultValues.displayZeroLines,
    use_new_flow_rate_model: defaultValues.useNewFlowRateModel,
    use_hourly_stats: defaultValues.useHourlyStats,
    unit_white_space: defaultValues.unitWhiteSpace,
    display_zero_state: defaultValues.displayZeroState,
    wh_decimals: defaultValues.watthourDecimals,
    kwh_decimals: defaultValues.kilowatthourDecimals,
    min_flow_rate: defaultValues.minFlowRate,
    max_flow_rate: defaultValues.maxFlowRate,
    max_expected_energy: defaultValues.maxExpectedEnergy,
    min_expected_energy: defaultValues.minExpectedEnergy,
    wh_kwh_threshold: defaultValues.whkWhThreshold,
  };
}

export function upgradeConfig(config: EnergyFlowCardPlusConfig): EnergyFlowCardPlusConfig {
  return {
    ...config,
    display_mode: config.display_mode ?? (config.energy_date_selection ? DisplayMode.History : DisplayMode.Live),
    energy_date_selection: undefined,
    min_flow_rate: coerceNumber(config.min_flow_rate, defaultValues.minFlowRate),
    max_flow_rate: coerceNumber(config.max_flow_rate, defaultValues.maxFlowRate),
    wh_decimals: coerceNumber(config.wh_decimals, defaultValues.watthourDecimals),
    kwh_decimals: coerceNumber(config.kwh_decimals, defaultValues.kilowatthourDecimals),
    mwh_decimals: coerceNumber(config.mwh_decimals, defaultValues.megawatthourDecimals),
    wh_kwh_threshold: coerceNumber(config.wh_kwh_threshold, defaultValues.whkWhThreshold),
    kwh_mwh_threshold: coerceNumber(config.kwh_mwh_threshold, defaultValues.kwhMwhThreshold),
    max_expected_energy: coerceNumber(config.max_expected_energy, defaultValues.maxExpectedEnergy),
    min_expected_energy: coerceNumber(config.min_expected_energy, defaultValues.minExpectedEnergy),
    entities: {
      ...config.entities,
      grid: {
        ...config.entities.grid,
        color_of_icon: getColorOfIconOrValue(config.entities.grid?.color_of_icon, config.entities.grid?.color_icon),
        color_icon: undefined,
        color_of_circle: getColorOfCircle(config.entities.grid?.color_of_circle, config.entities.grid?.color_circle),
        color_circle: undefined,
        secondary_info: {
          ...config.entities.grid?.secondary_info,
          color_of_value: getColorOfIconOrValue(config.entities.grid?.secondary_info?.color_of_value, config.entities.grid?.secondary_info?.color_value),
          color_value: undefined,
          unit_white_space: undefined
        }
      },
      battery: {
        ...config.entities.battery,
        color_of_icon: getColorOfIconOrValue(config.entities.battery?.color_of_icon, config.entities.battery?.color_icon),
        color_icon: undefined,
        color_of_circle: getColorOfCircle(config.entities.battery?.color_of_circle, config.entities.battery?.color_circle),
        color_circle: undefined,
        state_of_charge_unit_white_space: undefined
      },
      solar: {
        ...config.entities.solar,
        secondary_info: {
          ...config.entities.solar?.secondary_info,
          color_of_value: getColorOfIconOrValue(config.entities.solar?.secondary_info?.color_of_value, config.entities.solar?.secondary_info?.color_value),
          color_value: undefined,
          unit_white_space: undefined
        }
      },
      home: {
        ...config.entities.home,
        color_of_icon: getColorOfIconOrValue(config.entities.home?.color_of_icon, config.entities.home?.color_icon),
        color_icon: undefined,
        color_of_value: getColorOfIconOrValue(config.entities.home?.color_of_value, config.entities.home?.color_value),
        color_value: undefined,
        secondary_info: {
          ...config.entities.home?.secondary_info,
          color_of_value: getColorOfIconOrValue(config.entities.home?.secondary_info?.color_of_value, config.entities.home?.secondary_info?.color_value),
          color_value: undefined,
          unit_white_space: undefined
        }
      },
      fossil_fuel_percentage: {
        ...config.entities.fossil_fuel_percentage,
        unit_white_space: undefined,
        secondary_info: {
          ...config.entities.fossil_fuel_percentage?.secondary_info,
          color_of_value: getColorOfIconOrValue(config.entities.fossil_fuel_percentage?.secondary_info?.color_of_value, config.entities.fossil_fuel_percentage?.secondary_info?.color_value),
          color_value: undefined,
          unit_white_space: undefined
        }
      }
    }
  };
}

function getColorOfIconOrValue(colorOfIcon?: ColorMode, colorIcon?: any): ColorMode {
  return colorOfIcon ??
    (colorIcon
      ? typeof colorIcon === "boolean"
        ? colorIcon
          ? ColorMode.Color_Dynamically
          : ColorMode.Do_Not_Color
        : ColorMode[colorIcon]
      : ColorMode.Do_Not_Color);
}

function getColorOfCircle(colorOfCircle?: ColorMode, colorCircle?: any): ColorMode {
  return colorOfCircle ??
    (colorCircle && typeof colorCircle === "string"
      ? ColorMode[colorCircle]
      : ColorMode.Color_Dynamically);
}
