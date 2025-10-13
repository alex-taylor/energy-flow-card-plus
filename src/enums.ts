import localize from './localize/localize';

export enum DisplayMode {
  Live = 'live',
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

export enum ColorMode {
  Do_Not_Color = 'no_color',
  Color_Dynamically = 'dynamic',
  Production = 'production',
  Consumption = 'consumption',
  Solar = 'solar',
  Grid = 'grid',
  Battery = 'battery'
};

export namespace ColorMode {
  export function getName(value: ColorMode): string {
    return getEnumValueName(ColorMode, value);
  }

  export function getItem(value: ColorMode): { label: string, value: string } {
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

function getEnumValueName(type: any, value: any): string {
  return localize("editor." + value);
}
