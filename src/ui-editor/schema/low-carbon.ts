import { LowCarbonType } from '../../enums';
import {  nodeConfigSchema, singleValueNodeSchema } from './_schemas';

export const lowCarbonSchema = nodeConfigSchema(singleValueNodeSchema()).concat(
  {
    name: 'low_carbon_show_as',
    selector: {
      select: {
        options: [
          LowCarbonType.getItem(LowCarbonType.Energy),
          LowCarbonType.getItem(LowCarbonType.Percentage)
        ],
        mode: 'dropdown'
      }
    }
  });
