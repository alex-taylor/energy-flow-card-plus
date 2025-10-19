import { any, assign, boolean, integer, number, object, optional, string } from 'superstruct';
import { AppearanceOptions, EditorPages, EnergyUnitsOptions, FlowsOptions, GlobalOptions } from '.';

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

