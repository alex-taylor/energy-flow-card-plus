import memoizeOne from 'memoize-one';
import { ColourMode, DisplayMode, DotsMode, ZeroLinesMode } from '../../enums';

export const generalConfigSchema = memoizeOne(() => [
  {
    name: 'title',
    selector: { text: {} },
  },
  {
    name: 'display_mode',
    selector: {
      select: {
        options: [
          DisplayMode.getItem(DisplayMode.Today),
          DisplayMode.getItem(DisplayMode.History),
          DisplayMode.getItem(DisplayMode.Hybrid)
        ],
        mode: 'dropdown'
      }
    }
  }
]);

export const appearanceOptionsSchema = [
  {
    type: 'grid',
    column_min_width: '200px',
    schema: [
      {
        name: 'dashboard_link',
        selector: { navigation: {} }
      },
      {
        name: 'dashboard_link_label',
        selector: { text: {} }
      },
      {
        name: 'display_zero_state',
        selector: { boolean: {} }
      },
      {
        name: 'clickable_entities',
        selector: { boolean: {} }
      },
      {
        name: 'use_hourly_stats',
        selector: { boolean: {} }
      },
      {
        name: 'unit_white_space',
        selector: { boolean: {} }
      }
    ]
  },
  {
    type: 'grid',
    column_min_width: '400px',
    schema: [
      {
        name: 'display_zero_lines',
        type: 'expandable',
        schema: zeroLinesOptionsSchema()
      },
      {
        name: 'flows',
        type: 'expandable',
        schema: flowsOptionsSchema()
      },
      {
        name: 'energy_units',
        type: 'expandable',
        schema: energyUnitsOptionsSchema()
      }
    ]
  }
];

function zeroLinesOptionsSchema(): any[] {
  return [
    {
      type: 'grid',
      column_min_width: '200px',
      schema: [
        {
          name: 'zero_lines_display_as',
          selector: {
            select: {
              options: [
                ZeroLinesMode.getItem(ZeroLinesMode.Solid),
                ZeroLinesMode.getItem(ZeroLinesMode.Transparent),
                ZeroLinesMode.getItem(ZeroLinesMode.Greyed_Out),
                ZeroLinesMode.getItem(ZeroLinesMode.Custom),
                ZeroLinesMode.getItem(ZeroLinesMode.Hide)
              ],
              mode: 'dropdown'
            }
          }
        }
      ]
    }
  ];
}

function energyUnitsOptionsSchema(): any[] {
  return [
    {
      type: 'grid',
      column_min_width: '200px',
      schema: [
        {
          name: 'wh_kwh_threshold',
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 1 } }
        },
        {
          name: 'kwh_mwh_threshold',
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 1 } }
        },
        {
          name: 'wh_decimals',
          selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } }
        },
        {
          name: 'kwh_decimals',
          selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } }
        },
        {
          name: 'mwh_decimals',
          selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } }
        }
      ]
    }
  ];
}

function flowsOptionsSchema(): any[] {
  return [
    {
      type: 'grid',
      column_min_width: '400px',
      schema: [
        {
          name: 'animation',
          selector: {
            select: {
              options: [
                DotsMode.getItem(DotsMode.Dynamic),
                DotsMode.getItem(DotsMode.HASS),
                DotsMode.getItem(DotsMode.Off)
              ],
              mode: 'dropdown'
            }
          }
        }
      ]
    },
    {
      type: 'grid',
      column_min_width: '200px',
      schema: [
        {
          name: 'min_flow_rate',
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
        },
        {
          name: 'max_flow_rate',
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
        },
        {
          name: 'min_expected_energy',
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
        },
        {
          name: 'max_expected_energy',
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
        }
      ]
    }
  ];
}

export function nodeConfigSchema(entitySchema: Array<any> | undefined): any[] {
  let result: Array<any> = [];

  if (entitySchema) {
    result = result.concat(entitySchema);
  }

  result.push(
    {
      type: 'grid',
      column_min_width: '200px',
      schema: [
        { name: 'name', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } }
      ]
    },
    secondaryInfoSchema()
  );

  return result;
};

// TODO: support multiple entities
function entitySelectionSchema() {
  return {
    name: 'entity',
    selector: { entity: {} },
    // TODO: units, zero threshold, decimals
  };
};

export function singleValueNodeSchema(): Array<any> {
  return [
    {
      type: 'grid',
      column_min_width: '400px',
      schema: [
        entitySelectionSchema()
      ]
    },
    {
      type: 'grid',
      column_min_width: '200px',
      schema: [
        {
          name: 'colour_value',
          selector: { boolean: {} }
        },
        {
          name: 'colour_icon',
          selector: { boolean: {} }
        }
      ]
    },
    {
      type: 'grid',
      column_min_width: '400px',
      schema: [
        {
          name: 'custom_colour',
          // TODO: sort out a 'clear value' control, and factor out
          selector: { color_rgb: {} }
        }
      ]
    }
  ];
}

export function dualValueNodeSchema(): Array<any> {
  return [
    {
      type: 'grid',
      name: 'dual_entity',
      column_min_width: '400px',
      schema: [
        {
          ...entitySelectionSchema(),
          name: 'consumption_entities',
        },
        {
          ...entitySelectionSchema(),
          name: 'production_entities',
        }
      ]
    },
    {
      name: 'custom_colours',
      // TODO: see if this can be kept open without losing the name
      type: 'expandable',
      schema: [
        {
          type: 'grid',
          column_min_width: '200px',
          schema: [
            {
              name: 'consumption_colour',
              selector: { color_rgb: {} }
            },
            {
              name: 'production_colour',
              selector: { color_rgb: {} }
            }
          ]
        }
      ]
    },
    {
      type: 'grid',
      column_min_width: '67px',
      schema: [
        {
          name: 'colour_of_icon',
          selector: {
            select: {
              options: [
                ColourMode.getItem(ColourMode.Do_Not_Colour),
                ColourMode.getItem(ColourMode.Colour_Dynamically),
                ColourMode.getItem(ColourMode.Production),
                ColourMode.getItem(ColourMode.Consumption),
                ColourMode.getItem(ColourMode.Consumption_Sources)
              ],
              mode: 'dropdown'
            },
          },
        },
        {
          name: 'colour_of_circle',
          selector: {
            select: {
              options: [
                ColourMode.getItem(ColourMode.Colour_Dynamically),
                ColourMode.getItem(ColourMode.Production),
                ColourMode.getItem(ColourMode.Consumption),
                ColourMode.getItem(ColourMode.Consumption_Sources)
              ],
              mode: 'dropdown'
            }
          }
        },
        {
          name: 'colour_values',
          selector: { boolean: {} },
        }
      ]
    }
  ];
}

function secondaryInfoSchema() {
  return {
    name: 'secondary_info',
    type: 'expandable',
    schema: [
      entitySelectionSchema(),
      {
        name: 'template',
        selector: { template: {} }
      },
      {
        name: 'icon',
        selector: { icon: {} }
      }
    ]
  };
}
