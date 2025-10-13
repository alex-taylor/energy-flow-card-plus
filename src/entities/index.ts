import { HomeAssistant } from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import { coerceNumber, isNumberValue, unavailableOrMisconfiguredError } from "../utils";
import { Statistics, StatisticValue } from "../energy";
import type { BasicEntity } from "../config";

export const entityExists = (hass: HomeAssistant, entityId: string): boolean => entityId in hass.states;

export const entityAvailable = (hass: HomeAssistant, entityId: string): boolean => isNumberValue(hass.states[entityId]?.state);

export const getEntityStateObj = (hass: HomeAssistant, entity: string | undefined): HassEntity | undefined => {
  if (!entity || !entityAvailable(hass, entity)) {
    unavailableOrMisconfiguredError(entity);
    return undefined;
  }

  return hass.states[entity];
};

export const getEntityState = (hass: HomeAssistant, entity: string | string[] | undefined): number => {
  if (Array.isArray(entity)) {
    // TODO: sort this out!
    return 0;
  }

  return coerceNumber(getEntityStateObj(hass, entity as string)?.state || 0);
};

export const getEntityStateWattHours = (hass: HomeAssistant, statistics: Statistics | undefined, entity: BasicEntity | undefined): number => {
  if (!statistics || !entity) {
    return 0;
  }

  const entityStatistics = getEntityStatistics(hass, statistics, entity);
  let sum = 0;

  entityStatistics.forEach((value, key) => {
    sum += value;
  });

  return sum;
};

export const getEntityStatistics = (hass: HomeAssistant, statistics: Statistics, entity: BasicEntity): Map<number, number> => {
  const result: Map<number, number> = new Map();
  let entityArr: string[] = [];

  if (typeof entity === "string") {
    entityArr.push(entity);
  } else if (Array.isArray(entity)) {
    entityArr = entity;
  }

  entityArr.forEach((entity) => {
    if (!entity || !entityAvailable(hass, entity)) {
      unavailableOrMisconfiguredError(entity);
    }

    const stateObj = hass.states[entity];

    if (stateObj) {
      const units = stateObj.attributes.unit_of_measurement?.toUpperCase();
      const statisticsForEntity: StatisticValue[] = statistics[entity];

      if (statisticsForEntity && statisticsForEntity.length != 0) {
        statisticsForEntity.map((entry) => {
          const value = toWattHours(units, coerceNumber(entry.change));

          if (result.has(entry.start)) {
            result.set(entry.start, result.get(entry.start)! + value);
          } else {
            result.set(entry.start, value);
          }
        });
      }
    }
  });

  return result;
};

export const toWattHours = (units: string | undefined, value: number): number => {
  if (units?.startsWith("KWH")) {
    return value * 1000;
  }

  if (units?.startsWith("MWH")) {
    return value * 1000000;
  }

  return value;
};
