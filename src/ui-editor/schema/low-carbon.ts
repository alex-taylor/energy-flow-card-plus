import { EditorPages, EntitiesOptions, GlobalOptions, EnergyFlowCardExtConfig } from '@/config';
import { LowCarbonType } from '@/enums';
import { nodeConfigSchema, singleValueNodeSchema } from '.';

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
