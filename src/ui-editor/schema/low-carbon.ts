import { EnergyFlowCardExtConfig } from '@/config';
import { LowCarbonType } from '@/enums';
import { EditorPages, EntitiesOptions, GlobalOptions } from '.';
import { nodeConfigSchema, singleValueNodeSchema } from './schemas';

export function lowCarbonSchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Low_Carbon], singleValueNodeSchema(config, config?.[EditorPages.Low_Carbon]))
    .concat(
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
