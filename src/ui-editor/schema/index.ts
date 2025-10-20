import { AppearanceOptions, ColourOptions, EnergyUnitsOptions, EntitiesOptions, EntityOptions, FlowsOptions, GlobalOptions, OverridesOptions, SecondaryInfoOptions, AppearanceConfig, AppearanceOptionsConfig, DualValueColourConfig, DualValueNodeConfig, EnergyFlowCardExtConfig, EnergyUnitsConfig, EntityConfig, FlowsConfig, NodeConfig, SecondaryInfoConfig, SingleValueColourConfig, SingleValueNodeConfig } from '@/config';
import { ColourMode, DisplayMode, DotsMode, InactiveLinesMode, UnitDisplayMode } from '@/enums';
import { DEVICE_CLASS_ENERGY } from '../../const';

export function generalConfigSchema(config: EnergyFlowCardExtConfig | undefined) {
  return [
    {
      name: GlobalOptions.Title,
      selector: { text: {} },
    },
    {
      name: GlobalOptions.Display_Mode,
      required: true,
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            DisplayMode.getItem(DisplayMode.Today),
            DisplayMode.getItem(DisplayMode.History),
            DisplayMode.getItem(DisplayMode.Hybrid)
          ]
        }
      }
    }
  ];
}

export function appearanceSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: AppearanceConfig | undefined) {
  return [
    {
      name: [GlobalOptions.Options],
      type: 'expandable',
      schema: appearanceOptionsSchema(config, schemaConfig?.[GlobalOptions.Options])
    },
    {
      name: AppearanceOptions.Flows,
      type: 'expandable',
      schema: flowsOptionsSchema(config, schemaConfig?.[AppearanceOptions.Flows])
    },
    {
      name: AppearanceOptions.Energy_Units,
      type: 'expandable',
      schema: energyUnitsOptionsSchema(config, schemaConfig?.[AppearanceOptions.Energy_Units])
    }
  ];
}

function appearanceOptionsSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: AppearanceOptionsConfig | undefined): any[] {
  return [
    {
      type: 'grid',
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

function energyUnitsOptionsSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: EnergyUnitsConfig | undefined): any[] {
  return [
    {
      type: 'grid',
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

function flowsOptionsSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: FlowsConfig | undefined): any[] {
  return [
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
    },
    dynamicFlowsOptionsSchema(config, schemaConfig)
  ];
}

function dynamicFlowsOptionsSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: FlowsConfig | undefined): {} {
  if (schemaConfig?.[FlowsOptions.Animation] !== DotsMode.Dynamic) {
    return {};
  }

  return {
    type: 'grid',
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

export function nodeConfigSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: NodeConfig | undefined, entitySchema: any[] | undefined): any[] {
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
          schema: [
            { name: OverridesOptions.Name, selector: { text: {} } },
            { name: OverridesOptions.Icon, selector: { icon: {} } }
          ]
        }
      ]
    },
    secondaryInfoSchema(config, schemaConfig?.[EntitiesOptions.Secondary_Info])
  );

  return result;
};

function entitySelectionSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: EntityConfig | undefined, name: string, device_class: string | undefined = undefined): any[] {
  return [
    {
      name: name,
      type: 'expandable',
      schema: [
        {
          name: EntityOptions.Entity_Ids,
          selector: { entity: { multiple: true, device_class: device_class } }
        },
        {
          type: 'grid',
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

export function singleValueNodeSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: SingleValueNodeConfig | undefined): any[] {
  return entitySelectionSchema(config, schemaConfig?.[EntitiesOptions.Entities], EntitiesOptions.Entities, DEVICE_CLASS_ENERGY)
    .concat([
      {
        name: EntitiesOptions.Colours,
        type: 'expandable',
        schema: [
          {
            type: 'grid',
            schema: [
              {
                name: ColourOptions.Icon,
                required: true,
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: [
                      ColourMode.getItem(ColourMode.Do_Not_Colour),
                      ColourMode.getItem(ColourMode.Auto),
                      ColourMode.getItem(ColourMode.Custom)
                    ]
                  }
                }
              },
              {
                name: ColourOptions.Circle,
                required: true,
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: [
                      ColourMode.getItem(ColourMode.Auto),
                      ColourMode.getItem(ColourMode.Custom)
                    ]
                  }
                }
              },
              {
                name: ColourOptions.Value,
                required: true,
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: [
                      ColourMode.getItem(ColourMode.Do_Not_Colour),
                      ColourMode.getItem(ColourMode.Auto),
                      ColourMode.getItem(ColourMode.Custom)
                    ]
                  }
                }
              },
              singleValueColourPickerSchema(config, schemaConfig?.[EntitiesOptions.Colours])
            ]
          }
        ]
      }
    ]);
}

function singleValueColourPickerSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: SingleValueColourConfig | undefined): {} {
  if (schemaConfig?.[ColourOptions.Circle] === ColourMode.Custom || schemaConfig?.[ColourOptions.Icon] === ColourMode.Custom || schemaConfig?.[ColourOptions.Value] === ColourMode.Custom) {
    return {
      name: EntitiesOptions.Custom_Colour,
      selector: { color_rgb: {} }
    };
  }

  return {};
}

export function dualValueNodeSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: DualValueNodeConfig | undefined): any[] {
  return entitySelectionSchema(config, schemaConfig?.[EntitiesOptions.Import_Entities], EntitiesOptions.Import_Entities, DEVICE_CLASS_ENERGY)
    .concat(entitySelectionSchema(config, schemaConfig?.[EntitiesOptions.Export_Entities], EntitiesOptions.Export_Entities, DEVICE_CLASS_ENERGY))
    .concat([
      {
        name: EntitiesOptions.Colours,
        type: 'expandable',
        schema: [
          {
            type: 'grid',
            schema: [
              {
                name: [ColourOptions.Icon],
                required: true,
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: [
                      ColourMode.getItem(ColourMode.Do_Not_Colour),
                      ColourMode.getItem(ColourMode.Auto),
                      ColourMode.getItem(ColourMode.Import),
                      ColourMode.getItem(ColourMode.Export),
                      ColourMode.getItem(ColourMode.Custom)
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
                      ColourMode.getItem(ColourMode.Auto),
                      ColourMode.getItem(ColourMode.Import),
                      ColourMode.getItem(ColourMode.Export),
                      ColourMode.getItem(ColourMode.Export_Sources),
                      ColourMode.getItem(ColourMode.Custom)
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
                      ColourMode.getItem(ColourMode.Auto),
                      ColourMode.getItem(ColourMode.Custom)
                    ]
                  }
                }
              },
              dualValueColourPickerSchema(config, schemaConfig?.[EntitiesOptions.Colours])
            ]
          }
        ]
      }
    ]);
}

function dualValueColourPickerSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: DualValueColourConfig | undefined): {} {
  if (schemaConfig?.[ColourOptions.Circle] === ColourMode.Custom || schemaConfig?.[ColourOptions.Icon] === ColourMode.Custom || schemaConfig?.[ColourOptions.Values] === ColourMode.Custom) {
    return {
      type: 'grid',
      schema: [
        {
          name: EntitiesOptions.Import_Colour,
          selector: { color_rgb: {} }
        },
        {
          name: EntitiesOptions.Export_Colour,
          selector: { color_rgb: {} }
        }
      ]
    };
  }

  return {};
}

export function secondaryInfoSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: SecondaryInfoConfig | undefined): {} {
  return {
    name: EntitiesOptions.Secondary_Info,
    type: 'expandable',
    schema: entitySelectionSchema(config, schemaConfig?.[EntitiesOptions.Entities], EntitiesOptions.Entities)
      .concat([
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

