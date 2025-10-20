import { DeviceConfig, EnergyFlowCardExtConfig, EntitiesOptions, GlobalOptions, OverridesOptions } from '@/config';
import { DeviceType } from '@/enums';
import { secondaryInfoSchema, singleValueNodeSchema } from '.';

export function deviceSchema(config: EnergyFlowCardExtConfig | undefined, schemaConfig: DeviceConfig | undefined): any[] {
  const result: any[] = [
    {
      type: 'grid',
      schema: [
        { name: OverridesOptions.Name, required: true, selector: { text: {} } },
        { name: OverridesOptions.Icon, selector: { icon: {} } }
      ]
    }
  ].concat(singleValueNodeSchema(config, schemaConfig))

  result.push(secondaryInfoSchema(config, schemaConfig?.[EntitiesOptions.Secondary_Info]));

  result.push(
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
    }
  );

  return result;
}
