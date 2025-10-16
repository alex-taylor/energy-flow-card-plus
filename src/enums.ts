import localize from './localize/localize';

export enum DisplayMode {
  Today = 'today',
  History = 'history',
  Hybrid = 'hybrid'
};

export namespace DisplayMode {
  export function getName(value: DisplayMode): string {
    return getEditorLabel("DisplayMode", value);
  }

  export function getItem(value: DisplayMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum ColourMode {
  Do_Not_Colour = 'none',
  Colour_Dynamically = 'dynamic',
  Consumption = 'consumption',
  Consumption_Sources = 'consumption_sources',
  Production = 'production',
  Production_Sources = 'production_sources',
  Solar = 'solar',
  High_Carbon = 'high_carbon',
  Low_Carbon = 'low_carbon',
  Battery = 'battery'
};

export namespace ColourMode {
  export function getName(value: ColourMode): string {
    return getEditorLabel("ColourMode", value);
  }

  export function getItem(value: ColourMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum EntityType {
  Home = "home",
  HomeSecondary = "homeSecondary",
  Battery = "battery",
  Grid = "grid",
  Grid_Secondary = "gridSecondary",
  Solar = "solar",
  Solar_Secondary = "solarSecondary",
  LowCarbon = "low-carbon",
  LowCarbon_Secondary = "nonFossilSecondary"
};

export enum LowCarbonType {
  Energy = "energy",
  Percentage = "percentage"
};

export namespace LowCarbonType {
  export function getName(value: LowCarbonType): string {
    return getEditorLabel("LowCarbonType", value);
  }

  export function getItem(value: LowCarbonType): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum DeviceType {
  Consumption = "consumption",
  Production = "production"
};

export namespace DeviceType {
  export function getName(value: DeviceType): string {
    return getEditorLabel("DeviceType", value);
  }

  export function getItem(value: DeviceType): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
};

export enum ZeroLinesMode {
  Solid = "solid",
  Hide = "hide",
  Transparent = "transparent",
  Greyed_Out = "greyed_out",
  Custom = "custom"
};

export namespace ZeroLinesMode {
  export function getName(value: ZeroLinesMode): string {
    return getEditorLabel("ZeroLinesMode", value);
  }

  export function getItem(value: ZeroLinesMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
};

export enum DotsMode {
  Off = "off",
  HASS = "hass",
  Dynamic = "dynamic"
};

export namespace DotsMode {
  export function getName(value: DotsMode): string {
    return getEditorLabel("DotsMode", value);
  }

  export function getItem(value: DotsMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
};

function getEditorLabel(type: string, value: any): string {
  return localize(type + "." + value);
}
