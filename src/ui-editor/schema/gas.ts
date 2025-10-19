import { EnergyFlowCardExtConfig } from '@/config';
import { EditorPages, EntitiesOptions, GlobalOptions } from '.';
import { nodeConfigSchema, singleValueNodeSchema } from './schemas';

export function gasSchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Gas], singleValueNodeSchema(config, config?.[EditorPages.Gas]))
    .concat(
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
