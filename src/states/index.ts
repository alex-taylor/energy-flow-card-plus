import { HomeAssistant } from "custom-card-helpers";
import { EntitiesOptions, OverridesOptions } from "@/config";
import { DEVICE_CLASS_ENERGY } from "@/const";

export interface Flows {
  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
};

export interface States {
  batteryImport: number;
  batteryExport: number;
  batterySecondary: number;
  gasImport: number;
  gasSecondary: number;
  gridImport: number;
  gridExport: number;
  gridSecondary: number;
  highCarbon: number;
  home: number;
  homeSecondary: number;
  lowCarbon: number;
  lowCarbonPercentage: number;
  lowCarbonSecondary: number;
  solarImport: number;
  solarSecondary: number;
  devices: number[];
  devicesSecondary: any[];
  flows: Flows;
};

export abstract class State {
  public isPresent: boolean;
  public icon: string;
  public mainEntities: string[];
  public firstMainEntity?: string;

  protected constructor(hass: HomeAssistant, config: any, mainEntities: string[] = [], defaultIcon: string) {
    this.mainEntities = mainEntities;
    this.isPresent = mainEntities.length !== 0;
    this.firstMainEntity = this.isPresent ? mainEntities[0] : undefined;
    this.icon = config?.[EntitiesOptions.Overrides]?.[OverridesOptions.Icon] || defaultIcon;
  }
}

export const filterPrimaryEntities = (hass: HomeAssistant, entityIds: string[] = []): string[] => entityIds.filter(entityId => hass.states[entityId]?.attributes?.device_class === DEVICE_CLASS_ENERGY);
export const filterSecondaryEntities = (hass: HomeAssistant, entityIds: string[] = []): string[] => entityIds.filter(entityId => ["measurement", "total", "total_increasing"].includes(hass.states[entityId]?.attributes?.state_class || ""));
