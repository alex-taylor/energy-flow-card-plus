import { localize } from "@/localize/localize";

export const computeLabelCallback = (schema: any) => localize(`editor.${schema?.name}`);
export const computeHelperCallback = (schema: any): string => localize(`editor.${schema?.name}#helptext`, "");
