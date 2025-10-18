import { EnergyFlowCardExtConfig } from '@/config';
import { nodeConfigSchema, singleValueNodeSchema } from './schemas';

export function solarSchema(config: EnergyFlowCardExtConfig): any[] {
  return nodeConfigSchema(singleValueNodeSchema());
}
