import { any, assign, boolean, integer, number, object, optional, string } from 'superstruct';

const baseLovelaceCardConfigStruct = object({
  type: string(),
  view_layout: any(),
});

export const cardConfigStruct = assign(
  baseLovelaceCardConfigStruct,
  object({
    title: optional(string()),
    display_mode: optional(string()),

    appearance: object({
      dashboard_link: optional(string()),
      dashboard_link_label: optional(string()),
      display_zero_lines: optional(any()),
      display_zero_state: optional(boolean()),
      clickable_entities: optional(boolean()),
      use_hourly_stats: optional(boolean()),
      unit_white_space: optional(boolean()),

      energy_units: object({
        wh_decimals: optional(integer()),
        kwh_decimals: optional(integer()),
        mwh_decimals: optional(integer()),
        wh_kwh_threshold: optional(number()),
        kwh_mwh_threshold: optional(number())
      }),

      flows: object({
        min_flow_rate: optional(number()),
        max_flow_rate: optional(number()),
        min_expected_energy: optional(number()),
        max_expected_energy: optional(number()),
        mode: optional(string())
      })
    }),

    grid: optional(any()),
    gas: optional(any()),
    low_carbon: optional(any()),
    solar: optional(any()),
    battery: optional(any()),
    home: optional(any()),

    // TODO
    devices: optional(any())
  })
);
