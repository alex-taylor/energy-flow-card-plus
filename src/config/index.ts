import { LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';
import { ColourMode, DeviceType, DisplayMode, DotsMode, LowCarbonType, UnitDisplayMode, InactiveLinesMode } from '@/enums';
import { AppearanceOptions, ColourOptions, EditorPages, EnergyUnitsOptions, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions, OverridesOptions, PowerOutageOptions, SecondaryInfoOptions } from '@/ui-editor/schema';

declare global {
  interface HTMLElementTagNameMap {
    'hui-error-card': LovelaceCard;
  }
}

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
  [AppearanceOptions.Use_Hourly_Stats]?: boolean;
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

export interface LowCarbonConfig extends SingleValueNodeConfig {
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
  [EntitiesOptions.Colours]: SingleValueColourConfig;
};

export interface DeviceConfig extends SingleValueNodeConfig {
  type?: DeviceType;
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
  colour?: number[];
};

export interface DualValueColourConfig extends ValueColourConfig {
  [ColourOptions.Values]?: ColourMode;
  import_colour?: number[];
  export_colour?: number[];
};

export interface EntityConfig {
  [EntityOptions.Entity_Ids]?: string[];
  [EntityOptions.Units]?: string;
  [EntityOptions.Units_Mode]?: UnitDisplayMode;
  [EntityOptions.Zero_Threshold]?: number;
  [EntityOptions.Decimals]?: number;
}

interface PowerOutageConfig {
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
