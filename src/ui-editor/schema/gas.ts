import { nodeConfigSchema, singleValueNodeSchema } from './_schemas';

export const gasSchema = nodeConfigSchema(singleValueNodeSchema()).concat(
  {
    name: 'sum',
    label: 'Sum',
    selector: { boolean: {} }
  });
