import { EnergyFlowCardExtConfig } from '@/config';
import { EntitiesOptions, PowerOutageOptions } from '.';
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

export function gridSchema(config: EnergyFlowCardExtConfig): any[] {
  return nodeConfigSchema(dualValueNodeSchema()).concat(
    {
      name: [PowerOutageOptions.Power_Outage],
      type: 'expandable',
      schema: powerOutageGridSchema
    }
  );
}
