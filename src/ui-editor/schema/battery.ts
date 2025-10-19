import { EditorPages, EnergyFlowCardExtConfig } from '@/config';
import {  dualValueNodeSchema, nodeConfigSchema } from '.';

export function batterySchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Battery], dualValueNodeSchema(config, config?.[EditorPages.Battery]));
}
