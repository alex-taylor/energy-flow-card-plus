import { LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';
import { ColourMode, DeviceType, DisplayMode, DotsMode, LowCarbonType, UnitDisplayMode, InactiveLinesMode } from '@/enums';

declare global {
  interface HTMLElementTagNameMap {
    'hui-error-card': LovelaceCard;
  }
}

//================================================================================================================================================================================//
// These act both as keys in the YAML config, and as the names of the fields in the below Config interfaces                                                                       //
//================================================================================================================================================================================//

export enum EditorPages {
  Appearance = "appearance",
  Grid = "grid",
  Gas = "gas",
  Solar = "solar",
  Battery = "battery",
  Low_Carbon = "low_carbon_energy",
  Home = "home",
  Devices = "devices"
};

export enum GlobalOptions {
  Title = "title",
  Display_Mode = "display_mode",
  Options = "options"
};

export enum AppearanceOptions {
  Dashboard_Link = "dashboard_link",
  Dashboard_Link_Label = "dashboard_link_label",
  Inactive_Lines = "inactive_lines",
  Show_Zero_States = "show_zero_states",
  Clickable_Entities = "clickable_entities",
  Unit_Whitespace = "unit_whitespace",
  Energy_Units = "energy_units",
  Flows = "flows"
};

export enum EnergyUnitsOptions {
  Wh_Decimals = "wh_decimals",
  Kwh_Decimals = "kwh_decimals",
  Mwh_Decimals = "mwh_decimals",
  Wh_Kwh_Threshold = "wh_kwh_threshold",
  Kwh_Mwh_Threshold = "kwh_mwh_threshold"
};

export enum FlowsOptions {
  Use_Hourly_Stats = "use_hourly_stats",
  Animation = "animation",
  Min_Rate = "min_rate",
  Max_Rate = "max_rate",
  Min_Energy = "min_energy",
  Max_Energy = "max_energy"
};

export enum EntitiesOptions {
  Single_Entity = "entity",
  Entities = "entities",
  Import_Entities = "import_entities",
  Export_Entities = "export_entities",
  Colours = "colours",
  Overrides = "overrides",
  Secondary_Info = "secondary_info",
  Include_In_Home = "include_in_home",
  Low_Carbon_Mode = "low_carbon_mode",
  Custom_Colour = "custom_colour",
  Import_Colour = "import_colour",
  Export_Colour = "export_colour",
  Device_Type = "device_type"
};

export enum EntityOptions {
  Entity_Ids = "entity_ids",
  Units = "units",
  Units_Mode = "units_mode",
  Zero_Threshold = "zero_threshold",
  Decimals = "decimals"
};

export enum ColourOptions {
  Circle = "colour_of_circle",
  Icon = "colour_of_icon",
  Values = "colour_of_values",
  Value = "colour_of_value",
};

export enum PowerOutageOptions {
  Power_Outage = "power_outage",
  Label_Alert = "label_alert",
  Icon_Alert = "icon_alert",
  State_Alert = "state_alert"
};

export enum OverridesOptions {
  Name = "name",
  Icon = "icon"
};

export enum SecondaryInfoOptions {
  Icon = "icon",
  Template = "template"
}

//================================================================================================================================================================================//
// Config structure                                                                                                                                                               //
//================================================================================================================================================================================//

export interface EnergyFlowCardExtConfig extends LovelaceCardConfig {
  [GlobalOptions.Title]?: string;
  [GlobalOptions.Display_Mode]?: DisplayMode;
  [EditorPages.Appearance]?: AppearanceConfig;
  [EditorPages.Grid]?: GridConfig;
  [EditorPages.Gas]?: GasConfig;
  [EditorPages.Low_Carbon]?: LowCarbonConfig;
  [EditorPages.Solar]?: SolarConfig;
  [EditorPages.Battery]?: BatteryConfig;
  [EditorPages.Home]?: HomeConfig;
  [EditorPages.Devices]?: DeviceConfig[];
}

export interface AppearanceConfig {
  [GlobalOptions.Options]?: AppearanceOptionsConfig;
  [AppearanceOptions.Energy_Units]?: EnergyUnitsConfig;
  [AppearanceOptions.Flows]?: FlowsConfig;
};

export interface AppearanceOptionsConfig {
  [AppearanceOptions.Dashboard_Link]?: string;
  [AppearanceOptions.Dashboard_Link_Label]?: string;
  [AppearanceOptions.Inactive_Lines]?: InactiveLinesMode;
  [AppearanceOptions.Show_Zero_States]?: boolean;
  [AppearanceOptions.Clickable_Entities]?: boolean;
  [AppearanceOptions.Unit_Whitespace]?: boolean;
};

export interface EnergyUnitsConfig {
  [EnergyUnitsOptions.Wh_Decimals]?: number;
  [EnergyUnitsOptions.Kwh_Decimals]?: number;
  [EnergyUnitsOptions.Mwh_Decimals]?: number;
  [EnergyUnitsOptions.Wh_Kwh_Threshold]?: number;
  [EnergyUnitsOptions.Kwh_Mwh_Threshold]?: number;
};

export interface FlowsConfig {
  [FlowsOptions.Use_Hourly_Stats]?: boolean;
  [FlowsOptions.Animation]?: DotsMode;
  [FlowsOptions.Min_Rate]?: number;
  [FlowsOptions.Max_Rate]?: number;
  [FlowsOptions.Min_Energy]?: number;
  [FlowsOptions.Max_Energy]?: number;
};

export interface GridConfig extends DualValueNodeConfig {
  [PowerOutageOptions.Power_Outage]?: PowerOutageConfig;
};

export interface GasConfig extends SingleValueNodeConfig {
  [EntitiesOptions.Include_In_Home]?: boolean;
};

export interface LowCarbonConfig extends NodeConfig {
  [EntitiesOptions.Colours]?: SingleValueColourConfig;
  [GlobalOptions.Options]?: LowCarbonOptionsConfig;
};

export interface LowCarbonOptionsConfig {
  [EntitiesOptions.Low_Carbon_Mode]?: LowCarbonType;
};

export interface SolarConfig extends SingleValueNodeConfig {
};

export interface BatteryConfig extends DualValueNodeConfig {
};

export interface HomeConfig extends NodeConfig {
  [EntitiesOptions.Colours]?: SingleValueColourConfig;
};

export interface DeviceConfig {
  [OverridesOptions.Name]?: string;
  [OverridesOptions.Icon]?: string;
  [EntitiesOptions.Entities]?: EntityConfig;
  [EntitiesOptions.Colours]?: SingleValueColourConfig;
  [EntitiesOptions.Secondary_Info]?: SecondaryInfoConfig;
  [GlobalOptions.Options]?: DeviceOptionsConfig;
};

export interface DeviceOptionsConfig {
  [EntitiesOptions.Device_Type]?: DeviceType;
  [EntitiesOptions.Include_In_Home]?: boolean;
};

export interface NodeConfig {
  [EntitiesOptions.Overrides]?: OverridesConfig;
  [EntitiesOptions.Secondary_Info]?: SecondaryInfoConfig;
};

export interface OverridesConfig {
  [OverridesOptions.Name]?: string;
  [OverridesOptions.Icon]?: string;
};

export interface SingleValueNodeConfig extends NodeConfig {
  [EntitiesOptions.Entities]?: EntityConfig;
  [EntitiesOptions.Colours]?: SingleValueColourConfig;
};

export interface DualValueNodeConfig extends NodeConfig {
  [EntitiesOptions.Import_Entities]?: EntityConfig;
  [EntitiesOptions.Export_Entities]?: EntityConfig;
  [EntitiesOptions.Colours]?: DualValueColourConfig;
};

interface ValueColourConfig {
  [ColourOptions.Icon]?: ColourMode;
  [ColourOptions.Circle]?: ColourMode;
};

export interface SingleValueColourConfig extends ValueColourConfig {
  [ColourOptions.Value]?: ColourMode;
  [EntitiesOptions.Custom_Colour]?: number[];
};

export interface DualValueColourConfig extends ValueColourConfig {
  [ColourOptions.Values]?: ColourMode;
  [EntitiesOptions.Import_Colour]?: number[];
  [EntitiesOptions.Export_Colour]?: number[];
};

export interface EntityConfig {
  [EntityOptions.Entity_Ids]?: string[];
  [EntityOptions.Units]?: string;
  [EntityOptions.Units_Mode]?: UnitDisplayMode;
  [EntityOptions.Zero_Threshold]?: number;
  [EntityOptions.Decimals]?: number;
}

export interface PowerOutageConfig {
  [EntitiesOptions.Single_Entity]: string;
  [PowerOutageOptions.State_Alert]?: string;
  [PowerOutageOptions.Label_Alert]?: string;
  [PowerOutageOptions.Icon_Alert]?: string;
};

export interface SecondaryInfoConfig {
  [EntitiesOptions.Entities]?: EntityConfig;
  [SecondaryInfoOptions.Icon]?: string;
  [SecondaryInfoOptions.Template]?: string;
};
