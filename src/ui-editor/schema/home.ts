import { nodeConfigSchema } from './schemas';
import { ColourMode } from '@/enums';
import { EnergyFlowCardExtConfig } from '@/config';
import { ColourOptions, EntitiesOptions } from '.';

export function homeSchema(config: EnergyFlowCardExtConfig): any[] {
  return nodeConfigSchema(undefined).concat(
    {
      type: 'expandable',
      name: EntitiesOptions.Colours,
      schema: [
        {
          type: 'grid',
          column_min_width: '200px',
          schema: [
            {
              name: ColourOptions.Icon,
              required: true,
              selector: {
                select: {
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Colour_Dynamically),
                    ColourMode.getItem(ColourMode.Solar),
                    ColourMode.getItem(ColourMode.High_Carbon),
                    ColourMode.getItem(ColourMode.Low_Carbon),
                    ColourMode.getItem(ColourMode.Battery)
                  ],
                  mode: 'dropdown'
                },
              },
            },
            {
              name: ColourOptions.Value,
              required: true,
              selector: {
                select: {
                  options: [
                    ColourMode.getItem(ColourMode.Do_Not_Colour),
                    ColourMode.getItem(ColourMode.Colour_Dynamically),
                    ColourMode.getItem(ColourMode.Solar),
                    ColourMode.getItem(ColourMode.High_Carbon),
                    ColourMode.getItem(ColourMode.Low_Carbon),
                    ColourMode.getItem(ColourMode.Battery)
                  ],
                  mode: 'dropdown'
                },
              }
            }
          ]
        }
      ]
    }
  );
}
