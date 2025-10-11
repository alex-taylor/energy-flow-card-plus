import { LovelaceCardConfig } from 'custom-card-helpers';
import { ComboEntity, IndividualDeviceType, SecondaryInfoType, baseConfigEntity, baseEntity, gridPowerOutage } from './types';
import { ColorMode, DisplayMode } from "./enums";

interface mainConfigOptions {
  display_mode?: DisplayMode;
  dashboard_link?: string;
  dashboard_link_label?: string;
  min_flow_rate?: number;
  max_flow_rate?: number;
  wh_decimals?: number;
  kwh_decimals?: number;
  mwh_decimals?: number;
  wh_kwh_threshold?: number;
  kwh_mwh_threshold?: number;
  clickable_entities?: boolean;
  max_expected_energy?: number;
  min_expected_energy?: number;
  display_zero_lines?: boolean;
  energy_date_selection?: boolean;
  use_new_flow_rate_model?: boolean;
  use_hourly_stats?: boolean;
  unit_white_space?: boolean;
}

export interface EntitiesConfig {
  battery?: baseConfigEntity & {
    entity?: {
      consumption?: baseEntity;
      production?: baseEntity;
    };
    state_of_charge?: string;
    state_of_charge_unit?: string;
    // @deprecated replaced by mainConfigOptions#unit_white_space
    state_of_charge_unit_white_space?: boolean;
    state_of_charge_decimals?: number;
    color_state_of_charge_value?: boolean | 'production' | 'consumption';
    // @deprecated replaced by color_of_icon
    color_icon?: boolean | string;
    color_of_icon?: ColorMode;
    // @deprecated replaced by color_of_circle
    color_circle?: boolean | 'production' | 'consumption';
    color_of_circle?: ColorMode;
    color?: ComboEntity;
  };
  grid?: baseConfigEntity & {
    entity?: {
      consumption?: baseEntity;
      production?: baseEntity;
    };
    power_outage?: gridPowerOutage;
    secondary_info?: SecondaryInfoType;
    // @deprecated replaced by color_of_icon
    color_icon?: boolean | string;
    color_of_icon?: ColorMode;
    // @deprecated replaced by color_of_circle
    color_circle?: boolean | 'production' | 'consumption';
    color_of_circle?: ColorMode;
    color?: ComboEntity;
  };
  solar?: baseConfigEntity & {
    entity: baseEntity;
    color?: string | number[];
    color_icon?: boolean;
    color_value?: boolean;
    color_label?: boolean;
    secondary_info?: SecondaryInfoType;
    display_zero_state?: boolean;
  };
  home?: baseConfigEntity & {
    entity: baseEntity;
    override_state?: boolean;
    // @deprecated replaced by color_of_icon
    color_icon?: boolean | 'solar' | 'grid' | 'battery';
    color_of_icon?: ColorMode;
    // @deprecated replaced by color_of_value
    color_value?: boolean | 'solar' | 'grid' | 'battery';
    color_of_value?: ColorMode;
    subtract_individual?: boolean;
    secondary_info?: SecondaryInfoType;
  };
  fossil_fuel_percentage?: baseConfigEntity & {
    entity?: string;
    show?: boolean;
    color?: string;
    state_type?: 'percentage' | 'energy';
    color_icon?: boolean;
    display_zero?: boolean;
    display_zero_state?: boolean;
    display_zero_tolerance?: number;
    color_value?: boolean;
    color_label?: boolean;
    // @deprecated replaced by mainConfigOptions#unit_white_space
    unit_white_space?: boolean;
    decimals?: number;
    calculate_flow_rate?: boolean | number;
    secondary_info: SecondaryInfoType;
  };
  individual1?: IndividualDeviceType;
  individual2?: IndividualDeviceType;
}

export interface EnergyFlowCardPlusConfig extends LovelaceCardConfig, mainConfigOptions {
  entities: EntitiesConfig;
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

export function upgradeConfig(config: EnergyFlowCardPlusConfig): EnergyFlowCardPlusConfig {
  return {
    ...config,
    display_mode: config.display_mode ?? (config.energy_date_selection ? DisplayMode.History : DisplayMode.Live),
    energy_date_selection: undefined,
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
