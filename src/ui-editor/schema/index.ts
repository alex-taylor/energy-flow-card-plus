import { any, assign, boolean, integer, number, object, optional, string } from 'superstruct';

export enum EditorPages {
  Appearance = "appearance",
  Grid = "grid",
  Gas = "gas",
  Solar = "solar",
  Battery = "battery",
  Low_Carbon = "low_carbon",
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
  Use_Hourly_Stats = "use_hourly_stats",
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
  Export_Colour = "export_colour"
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

const baseLovelaceCardConfigStruct = object({
  type: string(),
  view_layout: any(),
});

export const cardConfigStruct = assign(
  baseLovelaceCardConfigStruct,
  object({
    [GlobalOptions.Title]: optional(string()),
    [GlobalOptions.Display_Mode]: optional(string()),

    [EditorPages.Appearance]: object({
      [GlobalOptions.Options]: object({
        [AppearanceOptions.Dashboard_Link]: optional(string()),
        [AppearanceOptions.Dashboard_Link_Label]: optional(string()),
        [AppearanceOptions.Inactive_Lines]: optional(string()),
        [AppearanceOptions.Show_Zero_States]: optional(boolean()),
        [AppearanceOptions.Clickable_Entities]: optional(boolean()),
        [AppearanceOptions.Use_Hourly_Stats]: optional(boolean()),
        [AppearanceOptions.Unit_Whitespace]: optional(boolean()),
      }),
      [AppearanceOptions.Energy_Units]: object({
        [EnergyUnitsOptions.Wh_Decimals]: optional(integer()),
        [EnergyUnitsOptions.Kwh_Decimals]: optional(integer()),
        [EnergyUnitsOptions.Mwh_Decimals]: optional(integer()),
        [EnergyUnitsOptions.Wh_Kwh_Threshold]: optional(number()),
        [EnergyUnitsOptions.Kwh_Mwh_Threshold]: optional(number())
      }),
      [AppearanceOptions.Flows]: object({
        [FlowsOptions.Animation]: optional(string()),
        [FlowsOptions.Min_Rate]: optional(number()),
        [FlowsOptions.Max_Rate]: optional(number()),
        [FlowsOptions.Min_Energy]: optional(number()),
        [FlowsOptions.Max_Energy]: optional(number())
      })
    }),

    // TODO: expand these out
    [EditorPages.Grid]: optional(any()),
    [EditorPages.Gas]: optional(any()),
    [EditorPages.Low_Carbon]: optional(any()),
    [EditorPages.Solar]: optional(any()),
    [EditorPages.Battery]: optional(any()),
    [EditorPages.Home]: optional(any()),

    // TODO
    [EditorPages.Devices]: optional(any())
  })
);
