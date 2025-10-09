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



function getEnumValueName(type: any, value: any): string {
  return localize("editor." + value);
}
