import localize from './localize/localize';

export enum DisplayMode {
  Today = 'today',
  History = 'history',
  Hybrid = 'hybrid'
};

export namespace DisplayMode {
  export function getName(value: DisplayMode): string {
    return getEnumValueName(DisplayMode, value);
  }

  export function getItem(value: DisplayMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
}

export enum ColourMode {
  Do_Not_Colour = 'no_colour',
  Colour_Dynamically = 'dynamic',
  Consumption = 'consumption',
  Consumption_Sources = 'consumption_sources',
  Production = 'production',
  Production_Sources = 'production_sources',
  Solar = 'solar',
  High_Carbon = 'high-carbon',
  Low_Carbon = 'low-carbon',
  Battery = 'battery'
};

export namespace ColourMode {
  export function getName(value: ColourMode): string {
    return getEnumValueName(ColourMode, value);
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
  Individual1 = "individual1",
  Individual1_Secondary = "individual1Secondary",
  Individual2 = "individual2",
  Individual2_Secondary = "individual2Secondary",
  LowCarbon = "low-carbon",
  LowCarbon_Secondary = "nonFossilSecondary"
};

export enum LowCarbonType {
  Energy = "energy",
  Percentage = "percentage"
};

export namespace LowCarbonType {
  export function getName(value: LowCarbonType): string {
    return getEnumValueName(LowCarbonType, value);
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
  export namespace DeviceType {
    export function getName(value: DeviceType): string {
      return getEnumValueName(DeviceType, value);
    }

    export function getItem(value: DeviceType): { label: string, value: string } {
      return { label: getName(value), value: value };
    }
  }
};

export enum ZeroLinesMode {
  Show = "show",
  Hide = "hide",
  Transparent = "transparent",
  Greyed_Out = "greyed_out",
  Custom = "custom"
};

export namespace ZeroLinesMode {
  export namespace ZeroLinesMode {
    export function getName(value: ZeroLinesMode): string {
      return getEnumValueName(ZeroLinesMode, value);
    }

    export function getItem(value: ZeroLinesMode): { label: string, value: string } {
      return { label: getName(value), value: value };
    }
  }
};

export enum DotsMode {
  Off = "off",
  HASS = "hass",
  Dynamic = "dynamic"
};

export namespace DotsMode {
  export function getName(value: DotsMode): string {
    return getEnumValueName(DotsMode, value);
  }

  export function getItem(value: DotsMode): { label: string, value: string } {
    return { label: getName(value), value: value };
  }
};

function getEnumValueName(type: any, value: any): string {
  return localize("editor." + value);
}
