import { ColourMode } from '../../enums';
import localize from '../../localize/localize';

// TODO: support multiple entities
export const singleEntitySelectionSchema = {
  name: 'entity',
  label: 'Entity',
  selector: { entity: {} },
  // TODO: units, zero threshold, decimals
};

export const getDualEntitySelectionSchema = () => {
  return {
    type: 'grid',
    title: localize('editor.dual_entity'),
    name: 'entity',
    schema: [
      {
        ...singleEntitySelectionSchema,
        name: 'consumption',
        label: 'Consumption'
      },
      {
        ...singleEntitySelectionSchema,
        name: 'production',
        label: 'Production'
      },
    ]
  } as const;
}

export const secondaryInfoSchema = {
  title: localize('editor.secondary_info'),
  name: 'secondary_info',
  type: 'expandable',
  schema: [
    {
      name: 'entity',
      selector: { entity: {} },
    },
    {
      name: 'template',
      label: 'Template (overrides entity, save to update)',
      selector: { template: {} },
    },
    {
      name: 'icon',
      label: 'Icon',
      selector: { icon: {} }
    }
  ]
} as const;

export const singleValueColourConfigSchema = [
  {
    name: 'colour_value',
    label: 'Colour Value',
    selector: { boolean: {} },
  },
  {
    name: 'colour_icon',
    label: 'Colour Icon',
    selector: { boolean: {} },
  },
  {
    name: 'colour',
    label: 'Colour',
    selector: { color_rgb: {} },
  },
];

export const dualValueColourConfigSchema = [
  {
    name: 'colour',
    title: localize('editor.dual_custom_colours'),
    type: 'expandable',
    schema: [
      {
        type: 'grid',
        column_min_width: '200px',
        schema: [
          {
            name: 'consumption',
            label: 'Consumption',
            selector: { color_rgb: {} },
          },
          {
            name: 'production',
            label: 'Production',
            selector: { color_rgb: {} },
          },
        ],
      },
    ]
  },
  {
    name: 'color_of_icon',
    label: 'Color of Icon',
    selector: {
      select: {
        options: [
          ColourMode.getItem(ColourMode.Do_Not_Colour),
          ColourMode.getItem(ColourMode.Colour_Dynamically),
          ColourMode.getItem(ColourMode.Production),
          ColourMode.getItem(ColourMode.Consumption)
        ],
        mode: 'dropdown'
      },
    },
  },
  {
    name: 'color_of_circle',
    label: 'Color of Circle',
    selector: {
      select: {
        options: [
          ColourMode.getItem(ColourMode.Colour_Dynamically),
          ColourMode.getItem(ColourMode.Production),
          ColourMode.getItem(ColourMode.Consumption)
        ],
        mode: 'dropdown'
      },
    },
  }
];

export const baseMainConfigSchema = {
  type: 'grid',
  column_min_width: '200px',
  schema: [
    { name: 'name', selector: { text: {} } },
    { name: 'icon', selector: { icon: {} } },
  ]
};
