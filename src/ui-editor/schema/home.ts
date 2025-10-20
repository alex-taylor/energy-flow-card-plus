import { nodeConfigSchema, singleValueColourPickerSchema } from '.';
import { ColourMode } from '@/enums';
import { ColourOptions, EditorPages, EntitiesOptions, EnergyFlowCardExtConfig, HomeConfig } from '@/config';

export function homeSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: HomeConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Home], undefined)
    .concat(
    {
      type: 'expandable',
      name: EntitiesOptions.Colours,
      schema: [
        {
          type: 'grid',
          schema: [
            {
              name: ColourOptions.Circle,
              required: true,
              selector: {
                select: {
                  mode: 'dropdown',
                  options: [
                    ColourMode.getItem(ColourMode.Consumption_Sources),
                    ColourMode.getItem(ColourMode.Largest_Value),
                    ColourMode.getItem(ColourMode.Solar),
                    ColourMode.getItem(ColourMode.High_Carbon),
                    ColourMode.getItem(ColourMode.Low_Carbon),
                    ColourMode.getItem(ColourMode.Battery),
                    ColourMode.getItem(ColourMode.Gas),
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
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Largest_Value),
                    ColourMode.getItem(ColourMode.Solar),
                    ColourMode.getItem(ColourMode.High_Carbon),
                    ColourMode.getItem(ColourMode.Low_Carbon),
                    ColourMode.getItem(ColourMode.Battery),
                    ColourMode.getItem(ColourMode.Gas),
                    ColourMode.getItem(ColourMode.Custom)
                  ],
                  mode: 'dropdown'
                },
              }
            },
            {
              name: ColourOptions.Icon,
              required: true,
              selector: {
                select: {
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Largest_Value),
                    ColourMode.getItem(ColourMode.Solar),
                    ColourMode.getItem(ColourMode.High_Carbon),
                    ColourMode.getItem(ColourMode.Low_Carbon),
                    ColourMode.getItem(ColourMode.Battery),
                    ColourMode.getItem(ColourMode.Gas),
                    ColourMode.getItem(ColourMode.Custom)
                  ],
                  mode: 'dropdown'
                },
              },
            },
            singleValueColourPickerSchema(config, schemaConfig?.[EntitiesOptions.Colours])
          ]
        }
      ]
    }
  );
}
