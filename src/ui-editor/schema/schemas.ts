import memoizeOne from 'memoize-one';
import { AppearanceOptions, ColourOptions, EditorPages, EnergyUnitsOptions, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions, OverridesOptions, SecondaryInfoOptions } from '.';
import { EnergyFlowCardExtConfig } from '@/config';
import { ColourMode, DisplayMode, DotsMode, InactiveLinesMode, UnitDisplayMode } from '@/enums';

export const generalConfigSchema = memoizeOne(() => [
  {
    name: GlobalOptions.Title,
    selector: { text: {} },
  },
  {
    name: GlobalOptions.Display_Mode,
    required: true,
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

export function appearanceSchema(config: EnergyFlowCardExtConfig) {
  return [
    {
      name: [GlobalOptions.Options],
      type: 'expandable',
      schema: appearanceOptionsSchema()
    },
    {
      name: AppearanceOptions.Flows,
      type: 'expandable',
      schema: flowsOptionsSchema(config)
    },
    {
      name: AppearanceOptions.Energy_Units,
      type: 'expandable',
      schema: energyUnitsOptionsSchema()
    }
  ];
}

function appearanceOptionsSchema(): any[] {
  return [
    {
      type: 'grid',
      column_min_width: '200px',
      schema: [
        {
          name: AppearanceOptions.Dashboard_Link,
          selector: { navigation: {} }
        },
        {
          name: AppearanceOptions.Dashboard_Link_Label,
          selector: { text: {} }
        },
        {
          name: AppearanceOptions.Show_Zero_States,
          selector: { boolean: {} }
        },
        {
          name: AppearanceOptions.Clickable_Entities,
          selector: { boolean: {} }
        },
        {
          name: AppearanceOptions.Use_Hourly_Stats,
          selector: { boolean: {} }
        },
        {
          name: AppearanceOptions.Unit_Whitespace,
          selector: { boolean: {} }
        }
      ]
    },
    {
      type: 'grid',
      column_min_width: '400px',
      schema: [
        {
          name: AppearanceOptions.Inactive_Lines,
          required: true,
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                InactiveLinesMode.getItem(InactiveLinesMode.Normal),
                InactiveLinesMode.getItem(InactiveLinesMode.Dimmed),
                InactiveLinesMode.getItem(InactiveLinesMode.Greyed),
                InactiveLinesMode.getItem(InactiveLinesMode.Hidden)
              ]
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
          name: EnergyUnitsOptions.Wh_Kwh_Threshold,
          required: true,
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 1 } }
        },
        {
          name: EnergyUnitsOptions.Kwh_Mwh_Threshold,
          required: true,
          selector: { number: { mode: 'box', min: 0, max: 1000000, step: 1 } }
        }
      ]
    },
    {
      type: 'grid',
      column_min_width: '67px',
      schema: [
        {
          name: EnergyUnitsOptions.Wh_Decimals,
          required: true,
          selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } }
        },
        {
          name: EnergyUnitsOptions.Kwh_Decimals,
          required: true,
          selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } }
        },
        {
          name: EnergyUnitsOptions.Mwh_Decimals,
          required: true,
          selector: { number: { mode: 'box', min: 0, max: 5, step: 1 } }
        }
      ]
    }
  ];
}

function flowsOptionsSchema(config: EnergyFlowCardExtConfig): any[] {
  return [
    {
      type: 'grid',
      column_min_width: '400px',
      schema: [
        {
          name: FlowsOptions.Animation,
          required: true,
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                DotsMode.getItem(DotsMode.Dynamic),
                DotsMode.getItem(DotsMode.HASS),
                DotsMode.getItem(DotsMode.Off)
              ]
            }
          }
        }
      ]
    },
    dynamicFlowsOptionsSchema(config)
  ];
}

function dynamicFlowsOptionsSchema(config: EnergyFlowCardExtConfig): {} {
  if (config?.[EditorPages.Appearance]?.[AppearanceOptions.Flows]?.[FlowsOptions.Animation] !== DotsMode.Dynamic) {
    return {};
  }

  return {
    type: 'grid',
    column_min_width: '100px',
    schema: [
      {
        name: FlowsOptions.Min_Rate,
        required: true,
        selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
      },
      {
        name: FlowsOptions.Max_Rate,
        required: true,
        selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
      },
      {
        name: FlowsOptions.Min_Energy,
        required: true,
        selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
      },
      {
        name: FlowsOptions.Max_Energy,
        required: true,
        selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } }
      }
    ]
  };
}

export function nodeConfigSchema(entitySchema: any[] | undefined): any[] {
  let result: Array<any> = [];

  if (entitySchema) {
    result = result.concat(entitySchema);
  }

  result.push(
    {
      name: EntitiesOptions.Overrides,
      type: 'expandable',
      schema: [
        {
          type: 'grid',
          column_min_width: '200px',
          schema: [
            { name: OverridesOptions.Name, selector: { text: {} } },
            { name: OverridesOptions.Icon, selector: { icon: {} } }
          ]
        }
      ]
    },
    secondaryInfoSchema()
  );

  return result;
};

function entitySelectionSchema(name: string): any[] {
  return [
    {
      name: name,
      type: 'expandable',
      schema: [
        {
          type: 'grid',
          column_min_width: '400px',
          schema: [
            // TODO: support multiple entities
            { name: name, selector: { entity: {} } }
          ]
        },
        {
          type: 'grid',
          column_min_width: '200px',
          schema: [
            {
              name: EntityOptions.Units_Mode,
              required: true,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: [
                    UnitDisplayMode.getItem(UnitDisplayMode.After),
                    UnitDisplayMode.getItem(UnitDisplayMode.Before),
                    UnitDisplayMode.getItem(UnitDisplayMode.Hidden)
                  ]
                }
              }
            },
            { name: EntityOptions.Units, selector: { text: {} } },
            { name: EntityOptions.Zero_Threshold, selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.01 } } },
            { name: EntityOptions.Decimals, selector: { number: { mode: 'box', min: 0, max: 3, step: 1 } } }
          ]
        }
      ]
    }
  ];
};

export function singleValueNodeSchema(): any[] {
  return entitySelectionSchema(EntitiesOptions.Entities).concat([
    {
      name: EntitiesOptions.Colours,
      type: 'expandable',
      schema: [
        {
          type: 'grid',
          column_min_width: '200px',
          schema: [
            {
              name: ColourOptions.Icon,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Colour_Dynamically)
                  ]
                }
              }
            },
            {
              name: ColourOptions.Value,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Colour_Dynamically)
                  ]
                }
              }
            }
          ]
        }
      ]
    }
  ]);
}

export function dualValueNodeSchema(): any[] {
  return entitySelectionSchema(EntitiesOptions.Import_Entities).concat(entitySelectionSchema(EntitiesOptions.Export_Entities)).concat([
    {
      name: EntitiesOptions.Colours,
      type: 'expandable',
      schema: [
        {
          type: 'grid',
          column_min_width: '200px',
          schema: [
            {
              name: [ColourOptions.Icon],
              required: true,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Colour_Dynamically),
                    ColourMode.getItem(ColourMode.Export),
                    ColourMode.getItem(ColourMode.Import)
                  ]
                }
              }
            },
            {
              name: [ColourOptions.Circle],
              required: true,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: [
                    ColourMode.getItem(ColourMode.Colour_Dynamically),
                    ColourMode.getItem(ColourMode.Export),
                    ColourMode.getItem(ColourMode.Import),
                    ColourMode.getItem(ColourMode.Export_Sources)
                  ]
                }
              }
            },
            {
              name: [ColourOptions.Values],
              required: true,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Colour_Dynamically)
                  ]
                }
              }
            }
          ]
        }
      ]
    }
  ]);
}

function secondaryInfoSchema(): {} {
  return {
    name: EntitiesOptions.Secondary_Info,
    type: 'expandable',
    schema: entitySelectionSchema(EntitiesOptions.Entities).concat([
      {
        name: [SecondaryInfoOptions.Template],
        selector: { template: {} }
      },
      {
        name: [SecondaryInfoOptions.Icon],
        selector: { icon: {} }
      }
    ])
  };
}
