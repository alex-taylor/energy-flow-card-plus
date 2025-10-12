import { LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';
import { ColorMode, DisplayMode } from '../enums';

declare global {
  interface HTMLElementTagNameMap {
    'hui-error-card': LovelaceCard;
  }
}

export type BasicEntity = string | string[];

export type ComboEntity = {
  consumption: string;
  production: string;
};

export interface EnergyFlowCardPlusConfig extends LovelaceCardConfig, MainConfigOptions {
  entities: EntitiesConfig;
}

interface MainConfigOptions {
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
  display_zero_state?: boolean;
}

interface EntitiesConfig {
  battery?: BatteryConfigEntity;
  grid?: GridConfigEntity;
  fossil_fuel_percentage?: FossilFuelConfigEntity;
  home?: HomeConfigEntity;
  solar?: SolarConfigEntity;
  individual1?: IndividualDeviceType;
  individual2?: IndividualDeviceType;
}

interface EntityConfigOptions {
  name?: string;
  icon?: string;
  display_zero_tolerance?: number;
  use_metadata?: boolean;
  secondary_info?: SecondaryInfoType;
}

interface BidirectionalConfigOptions {
  entity?: ComboEntity;
  invert_state?: boolean;
  // TODO: not valid here, should be an array of string|number[], separate for consumption/production
  color?: ComboEntity;
  color_of_icon?: ColorMode;
  color_of_circle?: ColorMode;

  // @deprecated replaced by color_of_icon
  color_icon?: any;
  // @deprecated replaced by color_of_circle
  color_circle?: any;
};

export interface BatteryConfigEntity extends EntityConfigOptions, BidirectionalConfigOptions {
  state_of_charge?: string;
  state_of_charge_unit?: string;
  state_of_charge_decimals?: number;
  color_state_of_charge_value?: ColorMode;

  // @deprecated replaced by mainConfigOptions#unit_white_space
  unit_white_space?: any;
  // @deprecated replaced by mainConfigOptions#unit_white_space
  state_of_charge_unit_white_space?: any;
};

export interface FossilFuelConfigEntity extends EntityConfigOptions {
  entity?: string;
  show?: boolean;
  color?: string | number[];
  state_type?: 'percentage' | 'energy';
  color_icon?: boolean;
  display_zero?: boolean;
  color_value?: boolean;
  color_label?: boolean;
  decimals?: number;
  calculate_flow_rate?: boolean | number;

  // @deprecated replaced by mainConfigOptions#unit_white_space
  unit_white_space?: any;
};

export interface GridConfigEntity extends EntityConfigOptions, BidirectionalConfigOptions {
  power_outage?: GridPowerOutage;
};

export interface HomeConfigEntity extends EntityConfigOptions {
  entity?: BasicEntity;
  override_state?: boolean;
  subtract_individual?: boolean;
  color_of_icon?: ColorMode;
  color_of_value?: ColorMode;

  // @deprecated replaced by color_of_icon
  color_icon?: any;
  // @deprecated replaced by color_of_value
  color_value?: any;
};

export interface SolarConfigEntity extends EntityConfigOptions {
  entity?: BasicEntity;
  color?: string | number[];
  color_icon?: boolean;
  color_value?: boolean;
  color_label?: boolean;
};

type GridPowerOutage = {
  entity: string;
  state_alert?: string;
  label_alert?: string;
  icon_alert?: string;
};

type SecondaryInfoType = {
  entity?: string;
  unit_of_measurement?: string;
  icon?: string;
  display_zero?: boolean;
  display_zero_tolerance?: number;
  color_of_value?: ColorMode;
  template?: string;
  decimals?: number;

  // @deprecated replaced by mainConfigOptions#unit_white_space
  unit_white_space?: any;
  // @deprecated replaced by color_of_value
  color_value?: any;
};

type IndividualDeviceType = {
  entity: BasicEntity;
  name?: string;
  icon?: string;
  color?: string;
  color_icon?: boolean;
  inverted_animation?: boolean;
  unit_of_measurement?: string;
  display_zero?: boolean;
  display_zero_tolerance?: number;
  secondary_info?: SecondaryInfoType;
  color_value?: boolean;
  color_label?: boolean;
  calculate_flow_rate?: boolean;
  use_metadata?: boolean;
  decimals?: number;
  show_direction?: boolean;

  // @deprecated replaced by mainConfigOptions#unit_white_space
  unit_white_space?: any;
};
