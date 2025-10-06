import { HomeAssistant, round } from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import { coerceNumber, isNumberValue, unavailableOrMisconfiguredError } from "../utils";
import { Statistics, StatisticValue } from "../energy";
import type { baseEntity } from "../types";

export const entityExists = (hass: HomeAssistant, entityId: string): boolean => entityId in hass.states;

export const entityAvailable = (hass: HomeAssistant, entityId: string): boolean => isNumberValue(hass.states[entityId]?.state);

export const getEntityStateObj = (hass: HomeAssistant, entity: string | undefined): HassEntity | undefined => {
  if (!entity || !entityAvailable(hass, entity)) {
    unavailableOrMisconfiguredError(entity);
    return undefined;
  }

  return hass.states[entity];
};

export const getEntityState = (hass: HomeAssistant, entity: string | undefined): number => {
  return coerceNumber(getEntityStateObj(hass, entity)?.state || 0);
};

export const getEntityStateWattHours = (hass: HomeAssistant, displayMode: string | undefined, periodStart: Date | undefined, periodEnd: Date | undefined, statistics: Statistics | undefined, entity: baseEntity | undefined): number => {
  if (!statistics || !entity) {
    return 0;
  }

  const entityStatistics = getEntityStatistics(hass, displayMode, periodStart, periodEnd, statistics, entity);
  let sum = 0;

  entityStatistics.forEach((value, key) => {
    sum += value;
  });

  return sum;
};

export const getEntityStatistics = (hass: HomeAssistant, displayMode: string | undefined, periodStart: Date | undefined, periodEnd: Date | undefined, statistics: Statistics, entity: baseEntity): Map<string, number> => {
  const result: Map<string, number> = new Map();
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

        if (displayMode !== "history") {
          const timestamp = Date.parse(stateObj.last_changed);

          if (!result.has(timestamp.toString())) {
            let start: Date;
            let end: Date;

            if (displayMode == "hybrid") {
              if (!periodStart) {
                return;
              }

              start = periodStart;
              end = periodEnd ?? new Date();
            } else {
              end = new Date();
              start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
            }

            if (timestamp >= start.getTime() && timestamp <= end.getTime()) {
              const state: number = coerceNumber(stateObj.state);
              const delta: number = toWattHours(units, state - coerceNumber(statisticsForEntity[statisticsForEntity.length - 1].state));
              result.set(Number.MAX_VALUE.toString(), delta);
            }
          }
        }
      }
    }
  });

  return result;
};

const toWattHours = (units: string | undefined, value: number): number => {
  if (units?.startsWith("KWH")) {
    return round(value * 1000, 0);
  }

  if (units?.startsWith("MWH")) {
    return round(value * 1000000, 0);
  }

  return value;
};
