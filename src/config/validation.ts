import { any, assign, boolean, integer, number, object, optional, string, array } from 'superstruct';
import { AppearanceOptions, ColourOptions, EditorPages, EnergyUnitsOptions, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions, OverridesOptions, PowerOutageOptions, SecondaryInfoOptions } from '.';

const baseLovelaceCardConfigStruct = object({
  type: string(),
  view_layout: any(),
});

const appearanceOptionsConfigStruct = object({
  [AppearanceOptions.Dashboard_Link]: optional(string()),
  [AppearanceOptions.Dashboard_Link_Label]: optional(string()),
  [AppearanceOptions.Inactive_Lines]: optional(string()),
  [AppearanceOptions.Show_Zero_States]: optional(boolean()),
  [AppearanceOptions.Clickable_Entities]: optional(boolean()),
  [AppearanceOptions.Unit_Whitespace]: optional(boolean()),
});

const energyUnitsOptionsConfigStruct = object({
  [EnergyUnitsOptions.Units_Mode]: optional(string()),
  [EnergyUnitsOptions.Wh_Display_Precision]: optional(integer()),
  [EnergyUnitsOptions.Kwh_Display_Precision]: optional(integer()),
  [EnergyUnitsOptions.Mwh_Display_Precision]: optional(integer()),
  [EnergyUnitsOptions.Wh_Kwh_Threshold]: optional(number()),
  [EnergyUnitsOptions.Kwh_Mwh_Threshold]: optional(number())
});

const flowsOptionsConfigStruct = object({
  [FlowsOptions.Use_Hourly_Stats]: optional(boolean()),
  [FlowsOptions.Animation]: optional(string()),
  [FlowsOptions.Min_Rate]: optional(number()),
  [FlowsOptions.Max_Rate]: optional(number()),
  [FlowsOptions.Min_Energy]: optional(number()),
  [FlowsOptions.Max_Energy]: optional(number())
});

const appearanceConfigStruct = object({
  [GlobalOptions.Options]: optional(appearanceOptionsConfigStruct),
  [AppearanceOptions.Energy_Units]: optional(energyUnitsOptionsConfigStruct),
  [AppearanceOptions.Flows]: optional(flowsOptionsConfigStruct)
});

const entitiesConfigStruct = object({
  [EntityOptions.Entity_Ids]: optional(array())
});

const secondaryEntitiesConfigStruct = object({
  [EntityOptions.Entity_Ids]: optional(array()),
  [EntityOptions.Units]: optional(string()),
  [EntityOptions.Units_Mode]: optional(string()),
  [EntityOptions.Zero_Threshold]: optional(number()),
  [EntityOptions.Display_Precision]: optional(number())
});

const valueColoursConfig = {
  [ColourOptions.Icon]: optional(string()),
  [ColourOptions.Circle]: optional(string())
};

const singleValueColoursConfigStruct = object({
  ...valueColoursConfig,
  [ColourOptions.Value]: optional(string()),
  [EntitiesOptions.Custom_Colour]: optional(number())
});

const dualValueColoursConfigStruct = object({
  ...valueColoursConfig,
  [ColourOptions.Values]: optional(string()),
  [EntitiesOptions.Import_Colour]: optional(number()),
  [EntitiesOptions.Export_Colour]: optional(number())
});

const overridesConfigStruct = object({
  [OverridesOptions.Name]: optional(string()),
  [OverridesOptions.Icon]: optional(string())
});

const secondaryInfoConfigStruct = object({
  [EntitiesOptions.Entities]: optional(secondaryEntitiesConfigStruct),
  [SecondaryInfoOptions.Icon]: optional(string()),
  [SecondaryInfoOptions.Template]: optional(string())
});

const nodeConfig = {
  [EntitiesOptions.Overrides]: optional(overridesConfigStruct),
  [EntitiesOptions.Secondary_Info]: optional(secondaryInfoConfigStruct)
};

const singleValueNodeConfig = {
  ...nodeConfig,
  [EntitiesOptions.Entities]: optional(entitiesConfigStruct),
  [EntitiesOptions.Colours]: optional(singleValueColoursConfigStruct)
};

const dualValueNodeConfig = {
  ...nodeConfig,
  [EntitiesOptions.Import_Entities]: optional(entitiesConfigStruct),
  [EntitiesOptions.Export_Entities]: optional(entitiesConfigStruct),
  [EntitiesOptions.Colours]: optional(dualValueColoursConfigStruct)
};

const batteryConfigStruct = object({
  ...dualValueNodeConfig,
  [EntitiesOptions.Overrides]: optional(overridesConfigStruct),
  [EntitiesOptions.Secondary_Info]: optional(secondaryInfoConfigStruct)
});

const gasConfigStruct = object({
  ...singleValueNodeConfig,
  [EntitiesOptions.Include_In_Home]: optional(boolean())
});

const powerOutageConfigStruct = object({
  [EntitiesOptions.Single_Entity]: optional(string()),
  [PowerOutageOptions.State_Alert]: optional(string()),
  [PowerOutageOptions.Label_Alert]: optional(string()),
  [PowerOutageOptions.Icon_Alert]: optional(string())

});

const gridConfigStruct = object({
  ...dualValueNodeConfig,
  [EntitiesOptions.Overrides]: optional(overridesConfigStruct),
  [EntitiesOptions.Secondary_Info]: optional(secondaryInfoConfigStruct),
  [PowerOutageOptions.Power_Outage]: optional(powerOutageConfigStruct)
});

const homeConfigStruct = object({
  ...nodeConfig,
  [EntitiesOptions.Colours]: optional(singleValueColoursConfigStruct)
});

const lowCarbonOptionsConfig = object({
  [EntitiesOptions.Low_Carbon_Mode]: optional(string())
});

const lowCarbonConfigStruct = object({
  ...singleValueNodeConfig,
  [EntitiesOptions.Overrides]: optional(overridesConfigStruct),
  [EntitiesOptions.Secondary_Info]: optional(secondaryInfoConfigStruct),
  [GlobalOptions.Options]: optional(lowCarbonOptionsConfig)
});

const solarConfigStruct = object({
  ...singleValueNodeConfig,
  [EntitiesOptions.Overrides]: optional(overridesConfigStruct),
  [EntitiesOptions.Secondary_Info]: optional(secondaryInfoConfigStruct)
});

const deviceOptionsConfigStruct = object({
  [EntitiesOptions.Device_Type]: optional(string()),
  [EntitiesOptions.Include_In_Home]: optional(boolean())
});

const deviceConfigStruct = object({
  [OverridesOptions.Name]: optional(string()),
  [OverridesOptions.Icon]: optional(string()),
  [EntitiesOptions.Entities]: optional(secondaryEntitiesConfigStruct),
  [EntitiesOptions.Colours]: optional(singleValueColoursConfigStruct),
  [EntitiesOptions.Secondary_Info]: optional(secondaryInfoConfigStruct),
  [GlobalOptions.Options]: optional(deviceOptionsConfigStruct)
});

export const cardConfigStruct = assign(
  baseLovelaceCardConfigStruct,
  object({
    [GlobalOptions.Title]: optional(string()),
    [GlobalOptions.Display_Mode]: optional(string()),
    [EditorPages.Appearance]: optional(appearanceConfigStruct),
    [EditorPages.Battery]: optional(batteryConfigStruct),
    [EditorPages.Gas]: optional(gasConfigStruct),
    [EditorPages.Grid]: optional(gridConfigStruct),
    [EditorPages.Home]: optional(homeConfigStruct),
    [EditorPages.Low_Carbon]: optional(lowCarbonConfigStruct),
    [EditorPages.Solar]: optional(solarConfigStruct),
    [EditorPages.Devices]: optional(array(deviceConfigStruct))
  })
);
