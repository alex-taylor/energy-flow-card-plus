import { nodeConfigSchema, singleValueNodeSchema } from './_schemas';

export const solarSchema = nodeConfigSchema(singleValueNodeSchema());
