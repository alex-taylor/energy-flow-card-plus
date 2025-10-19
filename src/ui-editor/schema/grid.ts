import { EnergyFlowCardExtConfig } from '@/config';
import { EditorPages, EntitiesOptions, PowerOutageOptions } from '.';
import { dualValueNodeSchema, nodeConfigSchema } from './schemas';

const powerOutageGridSchema: any[] = [
  {
    name: EntitiesOptions.Single_Entity,
    selector: { entity: {} },
  },
  {
    type: 'grid',
    column_min_width: '200px',
    schema: [
      { name: [PowerOutageOptions.Label_Alert], selector: { text: {} } },
      { name: [PowerOutageOptions.Icon_Alert], selector: { icon: {} } },
      { name: [PowerOutageOptions.State_Alert], selector: { text: {} } }
    ],
  },
];

export function gridSchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Grid], dualValueNodeSchema(config, config?.[EditorPages.Grid]))
    .concat(
    {
      name: [PowerOutageOptions.Power_Outage],
      type: 'expandable',
      schema: powerOutageGridSchema
    }
  );
}
