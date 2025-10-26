import { EditorPages, EntitiesOptions, GlobalOptions, EnergyFlowCardExtConfig } from '@/config';
import { LowCarbonType } from '@/enums';
import { nodeConfigSchema } from '.';

export function lowCarbonSchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Low_Carbon], undefined)
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
