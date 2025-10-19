import { DeviceConfig, EnergyFlowCardExtConfig, EntitiesOptions, GlobalOptions } from '@/config';
import { DeviceType } from '@/enums';
import { nodeConfigSchema, singleValueNodeSchema } from '.';

export function deviceSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: DeviceConfig | undefined): any[] {
  return nodeConfigSchema(config, schemaConfig, singleValueNodeSchema(config, schemaConfig))
    .concat(
      {
        name: GlobalOptions.Options,
        type: 'expandable',
        schema: [
          {
            name: EntitiesOptions.Device_Type,
            required: true,
            selector: {
              select: {
                mode: 'dropdown',
                options: [
                  DeviceType.getItem(DeviceType.Consumption_Electric),
                  DeviceType.getItem(DeviceType.Consumption_Gas),
                  DeviceType.getItem(DeviceType.Production_Electric),
                  DeviceType.getItem(DeviceType.Production_Gas)
                ]
              }
            }
          },
          {
            name: [EntitiesOptions.Include_In_Home],
            selector: { boolean: {} }
          }
        ]
      },
      {
        name: 'test',
        type: 'grid',
        schema: [
          { name: 'test1', selector: { entity: {} } },
        ]
      }
    );
}
