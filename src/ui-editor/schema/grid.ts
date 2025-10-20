import { EditorPages, EntitiesOptions, PowerOutageOptions, EnergyFlowCardExtConfig } from '@/config';
import { dualValueNodeSchema, nodeConfigSchema } from '.';

const powerOutageGridSchema: any[] = [
  {
    name: EntitiesOptions.Single_Entity,
    selector: { entity: {} },
  },
  {
    type: 'grid',
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
