import { getDualEntitySelectionSchema, getBaseMainConfigSchema, dualCustomColoursSchema } from './_schema-base';

const mainSchema = {
  ...getBaseMainConfigSchema('battery'),

  schema: [
    ...getBaseMainConfigSchema('battery').schema,
  ],
};

export const batterySchema = [
  getDualEntitySelectionSchema(),
  mainSchema,
  dualCustomColoursSchema,
] as const;
