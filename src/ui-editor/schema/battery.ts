import { EnergyFlowCardExtConfig } from '@/config';
import { EditorPages } from '.';
import {  dualValueNodeSchema, nodeConfigSchema } from './schemas';

export function batterySchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Battery], dualValueNodeSchema(config, config?.[EditorPages.Battery]));
}
