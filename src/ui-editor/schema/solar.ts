import { EnergyFlowCardExtConfig } from '@/config';
import { EditorPages } from '.';
import { nodeConfigSchema, singleValueNodeSchema } from './schemas';

export function solarSchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Solar], singleValueNodeSchema(config, config?.[EditorPages.Solar]));
}
