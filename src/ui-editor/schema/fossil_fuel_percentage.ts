import { secondaryInfoSchema, getBaseMainConfigSchema } from './_schema-base';
import localize from '../../localize/localize';

const mainSchema = {
  ...getBaseMainConfigSchema(),
  schema: [
    ...getBaseMainConfigSchema().schema,
    {
      name: 'state_type',
      label: 'State Type',
      selector: {
        select: {
          options: [
            { value: 'power', label: 'Power' },
            { value: 'percentage', label: 'Percentage' },
          ],
          mode: 'dropdown'
       },
      },
    },
    {
      name: 'color_value',
      label: 'Color Value',
      selector: { boolean: {} },
    },
    {
      name: 'color_icon',
      label: 'Color Icon',
      selector: { boolean: {} },
    },
    {
      name: 'display_zero',
      label: 'Display Zero',
      selector: { boolean: {} },
    },
    {
      name: 'display_zero_tolerance',
      label: 'Display Zero Tolerance',
      selector: { number: { mode: 'box', min: 0, max: 1000000, step: 0.1 } },
    },
    {
      name: 'display_zero_state',
      label: 'Display Zero State',
      selector: { boolean: {} },
    },
    {
      name: 'unit_white_space',
      label: 'Unit White Space',
      selector: { boolean: {} },
    },
    {
      name: 'decimals',
      label: 'Decimals',
      selector: { number: { mode: 'box', min: 0, max: 4, step: 1 } },
    },
  ],
};

export const nonFossilSchema = [
  {
    name: 'show',
    label: 'Show',
    selector: { boolean: {} },
  },
  {
    name: 'entity',
    label: 'Entity (Only used for click action)',
    selector: { entity: {} },
  },
  mainSchema,
  {
    name: 'color',
    label: 'Color',
    selector: { color_rgb: {} },
  },
  {
    title: localize('editor.secondary_info'),
    name: 'secondary_info',
    type: 'expandable',
    schema: secondaryInfoSchema,
  },
] as const;
