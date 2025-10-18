import { EnergyFlowCardExtConfig } from '@/config';
import { EntitiesOptions, GlobalOptions } from '.';
import { nodeConfigSchema, singleValueNodeSchema } from './schemas';

export function gasSchema(config: EnergyFlowCardExtConfig): any[] {
  return nodeConfigSchema(singleValueNodeSchema()).concat(
    {
      name: [GlobalOptions.Options],
      type: 'expandable',
      schema: [
        {
          name: [EntitiesOptions.Include_In_Home],
          selector: { boolean: {} }
        }
      ]
    }
  );
}
