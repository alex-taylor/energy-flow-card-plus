import { EnergyFlowCardExtConfig } from '@/config';
import {  dualValueNodeSchema, nodeConfigSchema } from './schemas';

export function batterySchema(config: EnergyFlowCardExtConfig): any[] {
  return nodeConfigSchema(dualValueNodeSchema());
}
