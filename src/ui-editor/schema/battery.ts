import {  dualValueNodeSchema, nodeConfigSchema } from './_schemas';

export const batterySchema = nodeConfigSchema(dualValueNodeSchema());
