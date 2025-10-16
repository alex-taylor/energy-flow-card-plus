import { LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';
import { ColourMode, DeviceType, DisplayMode, DotsMode, LowCarbonType, ZeroLinesMode } from '../enums';

declare global {
  interface HTMLElementTagNameMap {
    'hui-error-card': LovelaceCard;
  }
}

export interface EnergyFlowCardExtConfig extends LovelaceCardConfig {
  title?: string;
  display_mode?: DisplayMode;
  appearance?: AppearanceConfig;
  grid?: GridConfig;
  gas?: GasConfig;
  low_carbon?: LowCarbonConfig;
  solar?: SolarConfig;
  battery?: BatteryConfig;
  home?: HomeConfig;
  devices?: DeviceConfig[];
}

interface AppearanceConfig {
  dashboard_link?: string;
  dashboard_link_label?: string;
  display_zero_lines?: ZeroLinesConfig;
  display_zero_state?: boolean;
  clickable_entities?: boolean;
  use_hourly_stats?: boolean;
  unit_white_space?: boolean;
  energy_units?: EnergyUnitsConfig;
  flows?: FlowsConfig;
};

interface ZeroLinesConfig {
  mode?: ZeroLinesMode;
  transparency?: number;
  colour?: number[];
};

interface EnergyUnitsConfig {
  wh_decimals?: number;
  kwh_decimals?: number;
  mwh_decimals?: number;
  wh_kwh_threshold?: number;
  kwh_mwh_threshold?: number;
};

interface FlowsConfig {
  min_flow_rate?: number;
  max_flow_rate?: number;
  max_expected_energy?: number;
  min_expected_energy?: number;
  mode?: DotsMode;
};

export interface GridConfig extends DualValueNodeConfig {
  power_outage?: PowerOutageConfig;
};

export interface GasConfig extends SingleValueNodeConfig {
  sum?: boolean;
};

export interface LowCarbonConfig extends SingleValueNodeConfig {
  display?: LowCarbonType;
};

export interface SolarConfig extends SingleValueNodeConfig {
};

export interface BatteryConfig extends DualValueNodeConfig {
};

export interface HomeConfig extends NodeConfig {
  color_of_icon?: ColourMode;
  color_of_value?: ColourMode;
};

 export interface DeviceConfig extends SingleValueNodeConfig {
  type?: DeviceType;
  sum?: boolean;
};

export interface NodeConfig {
  name?: string;
  icon?: string;
  secondary_info?: SecondaryInfoConfig;
};

export interface SingleValueNodeConfig extends NodeConfig {
  entities?: EntityConfig;
  colour?: number[];
  colour_icon?: boolean;
  colour_value?: boolean;
};

export interface DualValueNodeConfig extends NodeConfig {
  consumption_entities?: EntityConfig;
  production_entities?: EntityConfig;
  consumption_colour?: number[];
  production_colour?: number[];
  colour_of_icon?: ColourMode;
  colour_of_circle?: ColourMode;
  colour_values?: boolean;
};

export interface EntityConfig {
  entity_ids?: string[];
  units?: string;
  zero_threshold?: number;
  decimals?: number;
}

interface PowerOutageConfig {
  entity: string;
  state_alert?: string;
  label_alert?: string;
  icon_alert?: string;
};

export interface SecondaryInfoConfig {
  entity?: EntityConfig;
  icon?: string;
  template?: string;
};
