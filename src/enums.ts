import { localize } from '@/localize/localize';

export enum DefaultValues {
  // EnergyUnits
  WattHourDecimals = 0,
  KilowattHourDecimals = 2,
  MegawattHourDecimals = 1,
  WhkWhThreshold = 1000,
  KwhMwhThreshold = 1000,

  // Flows
  MinRate = 1,
  MaxRate = 6,
  MinEnergy = 10,
  MaxEnergy = 2000
}

export enum DisplayMode {
  Today = "today",
  History = "history",
  Hybrid = "hybrid"
}

export namespace DisplayMode {
  export function getName(value: DisplayMode): string {
    return getEditorLabel("DisplayMode", value);
  }

  export function getItem(value: DisplayMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum ColourMode {
  Do_Not_Colour = "none",
  Default = "default",
  Circle = "circle",
  Largest_Value = "largest_value",
  Import = "import",
  Export = "export",
  Export_Sources = "export_sources",
  Consumption_Sources = "consumption_sources",
  Solar = "solar",
  High_Carbon = "high_carbon",
  Low_Carbon = "low_carbon",
  Battery = "battery",
  Gas = "gas",
  Custom = "custom"
}

export enum EntityType {
  Home = "home",
  HomeSecondary = "homeSecondary",
  Battery = "battery",
  Battery_Secondary = "batterySecondary",
  Device = "device",
  Gas = "gas",
  Grid = "grid",
  Grid_Secondary = "gridSecondary",
  Solar = "solar",
  Solar_Secondary = "solarSecondary",
  LowCarbon = "low-carbon",
  LowCarbon_Secondary = "nonFossilSecondary"
}

export namespace ColourMode {
  export function getName(value: ColourMode): string {
    return getEditorLabel("ColourMode", value);
  }

  export function getItem(value: ColourMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum LowCarbonType {
  Energy = "energy",
  Percentage = "percentage"
}

export namespace LowCarbonType {
  export function getName(value: LowCarbonType): string {
    return getEditorLabel("LowCarbonType", value);
  }

  export function getItem(value: LowCarbonType): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum DeviceType {
  Consumption_Electric = "consumption_electric",
  Production_Electric = "production_electric",
  Consumption_Gas = "consumption_gas",
  Production_Gas = "production_gas"
}

export namespace DeviceType {
  export function getName(value: DeviceType): string {
    return getEditorLabel("DeviceType", value);
  }

  export function getItem(value: DeviceType): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum InactiveLinesMode {
  Normal = "normal",
  Hidden = "hidden",
  Dimmed = "dimmed",
  Greyed = "greyed"
}

export namespace InactiveLinesMode {
  export function getName(value: InactiveLinesMode): string {
    return getEditorLabel("InactiveLinesMode", value);
  }

  export function getItem(value: InactiveLinesMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum DotsMode {
  Off = "off",
  HASS = "hass",
  Dynamic = "dynamic"
}

export namespace DotsMode {
  export function getName(value: DotsMode): string {
    return getEditorLabel("DotsMode", value);
  }

  export function getItem(value: DotsMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

function getEditorLabel(type: string, value: any): string {
  return localize(type + "." + value);
}

export enum UnitDisplayMode {
  Hidden = "hidden",
  Before = "before",
  After = "after",
  Before_Space = "before_space",
  After_Space = "after_space"
}

export namespace UnitDisplayMode {
  export function getName(value: UnitDisplayMode): string {
    return getEditorLabel("UnitDisplayType", value);
  }

  export function getItem(value: UnitDisplayMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum EntityMode {
  Totalising = "totalising",
  Resetting = "resetting",
  Misconfigured_Resetting = "misconfigured resetting"
}
