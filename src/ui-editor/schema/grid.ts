import { dualValueNodeSchema, nodeConfigSchema } from './_schemas';

const powerOutageGridSchema = [
  {
    name: 'entity',
    selector: { entity: {} },
  },
  {
    type: 'grid',
    column_min_width: '200px',
    schema: [
      { name: 'label_alert', label: 'Outage Label', selector: { text: {} } },
      { name: 'icon_alert', label: 'Outage Icon', selector: { icon: {} } },
      { name: 'state_alert', label: 'Outage State', selector: { text: {} } }
    ],
  },
];

export const gridSchema = nodeConfigSchema(dualValueNodeSchema()).concat(
  {
    name: 'power_outage',
    type: 'expandable',
    schema: powerOutageGridSchema
  });
