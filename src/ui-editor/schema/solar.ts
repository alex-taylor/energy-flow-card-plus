import { EditorPages, EnergyFlowCardExtConfig } from '@/config';
import { nodeConfigSchema, singleValueNodeSchema } from '.';

export function solarSchema(config: EnergyFlowCardExtConfig | undefined): any[] {
  return nodeConfigSchema(config, config?.[EditorPages.Solar], singleValueNodeSchema(config, config?.[EditorPages.Solar]));
}
