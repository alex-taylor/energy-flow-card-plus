import { any, assign, boolean, integer, number, object, optional, string } from 'superstruct';
import { gridSchema } from './grid';
import { batterySchema } from './battery';
import { solarSchema } from './solar';
import { lowCarbonSchema } from './low-carbon';
import { homeSchema } from './home';
import memoizeOne from 'memoize-one';
import { DisplayMode, DotsMode } from '../../enums';

const baseLovelaceCardConfig = object({
  type: string(),
  view_layout: any(),
});

export const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    display_mode: optional(string()),

    appearance: object({
      dashboard_link: optional(string()),
      dashboard_link_label: optional(string()),
      display_zero_lines: optional(boolean()),
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

    devices: object({
      // TODO
    })
  }),
);

export const generalConfigSchema = [
  {
    name: 'title',
    label: 'Title',
    selector: { text: {} },
  },
  {
    name: 'display_mode',
    label: 'Display Mode',
    selector: {
      select: {
        options: [
          DisplayMode.getItem(DisplayMode.Today),
          DisplayMode.getItem(DisplayMode.History),
          DisplayMode.getItem(DisplayMode.Hybrid)
        ],
        mode: 'dropdown'
      },
    }
  },
] as const;

export const nodesSchema = memoizeOne(localize => [
  {
    name: 'nodes',
    type: 'grid',
    column_min_width: '400px',
    schema: [
      {
        title: localize('editor.grid'),
        name: 'grid',
        type: 'expandable',
        schema: gridSchema,
      },
      {
        title: localize('editor.gas'),
        name: 'gas',
        type: 'expandable',
        schema: gasSchema,
      },
      {
        title: localize('editor.solar'),
        name: 'solar',
        type: 'expandable',
        schema: solarSchema,
      },
      {
        title: localize('editor.battery'),
        name: 'battery',
        type: 'expandable',
        schema: batterySchema,
      },
      {
        title: localize('editor.low_carbon'),
        name: 'low_carbon',
        type: 'expandable',
        schema: lowCarbonSchema,
      },
      {
        title: localize('editor.home'),
        name: 'home',
        type: 'expandable',
        schema: homeSchema,
      },
      // TODO add devices
    ],
  },
]);

export const appearanceOptionsSchema = memoizeOne(localize => [
  {
    title: localize('editor.appearance'),
    type: 'expandable',
    schema: [
      {
        type: 'grid',
        column_min_width: '200px',
        schema: [
          {
            name: 'dashboard_link',
            label: 'Dashboard Link',
            selector: { navigation: {} },
          },
          {
            name: 'dashboard_link_label',
            label: 'Dashboard Link Label',
            selector: { text: {} },
          },
          {
            name: 'display_zero_lines',
            label: 'Display Zero Lines',
            selector: { boolean: {} },
          },
          {
            name: 'display_zero_state',
            label: 'Display Zero State',
            selector: { boolean: {} }
          },
          {
            name: 'clickable_entities',
            label: 'Clickable Entities',
            selector: { boolean: {} },
          },
          {
            name: 'use_hourly_stats',
            label: 'Use Hourly Stats',
            selector: { boolean: {} },
          },
          {
            name: 'unit_white_space',
            label: 'Unit White Space',
            selector: { boolean: {} }
          },
          {
            name: 'energy_units',
            type: 'expandable',
            schema: energyUnitsOptionsSchema
          },
          {
            name: 'flows',
            type: 'expandable',
            schema: flowsOptionsSchema
          }
        ],
      },
    ],
  },
]);

export const energyUnitsOptionsSchema = memoizeOne(localize => [
  {
    title: localize('editor.energy_units'),
    type: 'expandable',
    schema: [
      {
        type: 'grid',
        column_min_width: '200px',
        schema: [
          {
            name: 'wh_decimals',
            label: 'Wh Decimals',
            selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } },
          },
          {
            name: 'kwh_decimals',
            label: 'kWh Decimals',
            selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } },
          },
          {
            name: 'mwh_decimals',
            label: 'MWh Decimals',
            selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } },
          },
          {
            name: 'wh_kwh_threshold',
            label: 'Wh/kWh Threshold',
            selector: { number: { mode: 'box', min: 0, max: 1000000, step: 1 } },
          },
          {
            name: 'kwh_mwh_threshold',
            label: 'kWh/MWh Threshold',
            selector: { number: { mode: 'box', min: 0, max: 1000000, step: 1 } },
          }
        ],
      },
    ],
  },
]);

export const flowsOptionsSchema = memoizeOne(localize => [
  {
    title: localize('editor.flows'),
    type: 'expandable',
    schema: [
      {
        type: 'grid',
        column_min_width: '200px',
        schema: [
          {
            name: 'dots_mode',
            label: 'Mode',
            selector: {
              options: [
                DotsMode.getItem(DotsMode.Dynamic),
                DotsMode.getItem(DotsMode.HASS),
                DotsMode.getItem(DotsMode.Off)
              ],
              mode: 'dropdown'
            }
          },
          {
            name: 'max_flow_rate',
            label: 'Max Flow Rate (Seconds/Dot)',
            selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } },
          },
          {
            name: 'min_flow_rate',
            label: 'Min Flow Rate (Seconds/Dot)',
            selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } },
          },
          {
            name: 'max_expected_energy',
            label: 'Max Expected Power (in Watts)',
            selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } },
          },
          {
            name: 'min_expected_energy',
            label: 'Min Expected Power (in Watts)',
            selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } },
          }
        ],
      },
    ],
  },
]);
