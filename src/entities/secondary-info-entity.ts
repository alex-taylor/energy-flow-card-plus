import { ColorMode } from "../enums";

export type SecondaryInfoEntity = {
  isPresent: boolean;
  entity?: string;
  template?: string;
  state: string | number | null;
  icon?: string;
  unit?: string;
  decimals?: number;
  colorType?: ColorMode;
};
