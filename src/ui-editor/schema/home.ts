import { getBaseMainConfigSchema, secondaryInfoSchema } from './_schema-base';
import localize from '../../localize/localize';

const mainSchema = {
  ...getBaseMainConfigSchema(),
  schema: [
    ...getBaseMainConfigSchema().schema,
    {
      name: 'color_of_value',
      label: 'Color of Value',
      selector: {
        select: {
          options: [
            { value: true, label: 'Color dynamically' },
            { value: false, label: 'Do Not Color' },
            { value: 'solar', label: 'Solar' },
            { value: 'grid', label: 'Grid' },
            { value: 'battery', label: 'Battery' },
          ],
          mode: 'dropdown'
        },
      },
    },
    {
      name: 'color_of_icon',
      label: 'Color of Icon',
      selector: {
        select: {
          options: [
            { value: true, label: 'Color dynamically' },
            { value: false, label: 'Do Not Color' },
            { value: 'solar', label: 'Solar' },
            { value: 'grid', label: 'Grid' },
            { value: 'battery', label: 'Battery' },
          ],
          mode: 'dropdown'
        },
      },
    },
    {
      name: 'subtract_individual',
      label: 'Subtract Individual',
      selector: { boolean: {} },
    },
    {
      name: 'override_state',
      label: 'Override State (With Home Entity)',
      selector: { boolean: {} },
    }
  ],
};

export const homeSchema = [
  {
    name: 'entity',
    selector: { entity: {} },
  },
  mainSchema,
  {
    title: localize('editor.secondary_info'),
    name: 'secondary_info',
    type: 'expandable',
    schema: secondaryInfoSchema,
  },
] as const;
