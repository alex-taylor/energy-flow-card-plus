import { nodeConfigSchema } from './_schemas';
import { ColourMode } from '../../enums';

export const homeSchema = nodeConfigSchema(undefined).concat(
  {
    type: 'grid',
    column_min_width: '200px',
    schema: [
      {
        name: 'colour_of_value',
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
        name: 'colour_of_icon',
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
  });
