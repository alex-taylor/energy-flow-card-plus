import { DeviceType } from '../../enums';
import { nodeConfigSchema, singleValueNodeSchema } from './_schemas';

export const deviceSchema = [
  nodeConfigSchema(singleValueNodeSchema()),
  {
    name: 'device_type',
    selector: {
      select: {
        options: [
          DeviceType.getItem(DeviceType.Consumption),
          DeviceType.getItem(DeviceType.Production)
        ],
        mode: 'dropdown'
      }
    }
  },
  {
    name: 'sum',
    selector: { boolean: {} }
  }
] as const;
