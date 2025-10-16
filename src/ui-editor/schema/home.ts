import { getBaseMainConfigSchema, secondaryInfoSchema } from './_schema-base';
import localize from '../../localize/localize';
import { ColourMode } from '../../enums';

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
            ColourMode.getItem(ColourMode.Do_Not_Colour),
            ColourMode.getItem(ColourMode.Colour_Dynamically),
            ColourMode.getItem(ColourMode.Solar),
            ColourMode.getItem(ColourMode.High_Carbon),
            ColourMode.getItem(ColourMode.Low_Carbon),
            ColourMode.getItem(ColourMode.Battery),
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
            ColourMode.getItem(ColourMode.Do_Not_Colour),
            ColourMode.getItem(ColourMode.Colour_Dynamically),
            ColourMode.getItem(ColourMode.Solar),
            ColourMode.getItem(ColourMode.High_Carbon),
            ColourMode.getItem(ColourMode.Low_Carbon),
            ColourMode.getItem(ColourMode.Battery),
          ],
          mode: 'dropdown'
        },
      },
    }
  ],
};

export const homeSchema = [
  mainSchema,
  {
    title: localize('editor.secondary_info'),
    name: 'secondary_info',
    type: 'expandable',
    schema: secondaryInfoSchema,
  },
] as const;
