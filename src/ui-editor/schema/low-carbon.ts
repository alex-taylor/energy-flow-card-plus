import { EnergyFlowCardExtConfig } from '@/config';
import { LowCarbonType } from '@/enums';
import { EntitiesOptions, GlobalOptions } from '.';
import { nodeConfigSchema, singleValueNodeSchema } from './schemas';

export function lowCarbonSchema(config: EnergyFlowCardExtConfig): any[] {
  return nodeConfigSchema(singleValueNodeSchema()).concat(
    {
      name: [GlobalOptions.Options],
      type: 'expandable',
      schema: [
        {
          name: [EntitiesOptions.Low_Carbon_Mode],
          required: true,
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                LowCarbonType.getItem(LowCarbonType.Energy),
                LowCarbonType.getItem(LowCarbonType.Percentage)
              ]
            }
          }
        }
      ]
    }
  );
}
