import { SecondaryInfoType } from "../config";
import { ColorMode } from "../enums";

export class SecondaryInfoEntity {
  isPresent: boolean;
  entity?: string;
  template?: string;
  state: string | number | null;
  icon?: string;
  unit?: string;
  decimals?: number;
  colorType?: ColorMode;
  displayZero?: boolean;
  displayZeroTolerance?: number;

  public constructor(secondary: SecondaryInfoType | undefined) {
    this.isPresent = secondary?.entity !== null && secondary?.template !== null;
    this.entity = secondary?.entity;
    this.template = secondary?.template;
    this.state = 0;
    this.icon = secondary?.icon;
    this.unit = secondary?.unit_of_measurement;
    this.decimals = secondary?.decimals;
    this.colorType = secondary?.color_of_value;
    this.displayZero = secondary?.display_zero;
    this.displayZeroTolerance = secondary?.display_zero_tolerance;
  }
};
