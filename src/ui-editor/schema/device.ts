import { EnergyFlowCardExtConfig } from '@/config';
import { DeviceType } from '@/enums';
import { EntitiesOptions } from '.';
import { nodeConfigSchema, singleValueNodeSchema } from './schemas';

export function deviceSchema(config: EnergyFlowCardExtConfig): any[] {
  return nodeConfigSchema(singleValueNodeSchema()).concat(
    {
      name: 'device_type',
      required: true,
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
      name: [EntitiesOptions.Include_In_Home],
      selector: { boolean: {} }
    }
  );
}
