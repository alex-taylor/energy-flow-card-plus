import { secondaryInfoSchema, baseMainConfigSchema, singleValueColourConfigSchema, singleEntitySelectionSchema } from './_schema-base';

export const solarSchema = [
  singleEntitySelectionSchema,
  baseMainConfigSchema,
  singleValueColourConfigSchema,
  secondaryInfoSchema
] as const;
