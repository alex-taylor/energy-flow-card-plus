import { EditorPages, EntitiesOptions, GlobalOptions, EnergyFlowCardExtConfig } from '@/config';
import { nodeConfigSchema, singleValueNodeSchema } from '.';

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
