/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HomeAssistant, round } from 'custom-card-helpers';
import { addDays, getHours } from 'date-fns';
import { Collection } from 'home-assistant-js-websocket';

interface StatisticsMetaData {
  statistics_unit_of_measurement: string | null;
  statistic_id: string;
  source: string;
  name?: string | null;
  has_sum: boolean;
  has_mean: boolean;
  unit_class: string | null;
}

interface ConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state: 'loaded' | 'setup_error' | 'migration_error' | 'setup_retry' | 'not_loaded' | 'failed_unload' | 'setup_in_progress';
  supports_options: boolean;
  supports_remove_device: boolean;
  supports_unload: boolean;
  pref_disable_new_entities: boolean;
  pref_disable_polling: boolean;
  disabled_by: 'user' | null;
  reason: string | null;
}

interface FossilEnergyConsumption {
  [date: string]: number;
}

export interface EnergyData {
  start: Date;
  end?: Date;
  startCompare?: Date;
  endCompare?: Date;
  prefs: EnergyPreferences;
  info: EnergyInfo;
  stats: Statistics;
  statsMetadata: Record<string, StatisticsMetaData>;
  statsCompare: Statistics;
  co2SignalConfigEntry?: ConfigEntry;
  co2SignalEntity?: string;
  fossilEnergyConsumption?: FossilEnergyConsumption;
  fossilEnergyConsumptionCompare?: FossilEnergyConsumption;
}

export interface Statistics {
  [statisticId: string]: StatisticValue[];
}

export interface StatisticValue {
  statistic_id: string;
  start: number;
  end: number;
  last_reset: string | null;
  max: number | null;
  mean: number | null;
  min: number | null;
  sum: number | null;
  state: number | null;
  change: number | null;
}

export interface EnergySource {
  type: string;
  stat_energy_from?: string;
  stat_energy_to?: string;
  flow_from?: {
    stat_energy_from: string;
  }[];
  flow_to?: {
    stat_energy_to: string;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeviceConsumptionEnergyPreference {
  stat_consumption: string;
}

export interface EnergyPreferences {
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumptionEnergyPreference[];
}

export interface EnergyInfo {
  cost_sensors: Record<string, string>;
}

export interface EnergyCollection extends Collection<EnergyData> {
  start: Date;
  end?: Date;
  prefs?: EnergyPreferences;
  clearPrefs(): void;
  setPeriod(newStart: Date, newEnd?: Date): void;
  _refreshTimeout?: number;
  _updatePeriodTimeout?: number;
  _active: number;
}

export const getEnergyDataCollection = (hass: HomeAssistant, key = '_energy'): EnergyCollection | null => {
  if ((hass.connection as any)[key]) {
    return (hass.connection as any)[key];
  }

  // HA has not initialized the collection yet and we don't want to interfere with that
  return null;
};

export async function getStatistics(hass: HomeAssistant, periodStart: Date, periodEnd: Date, entities: string[], period: '5minute' | 'hour' | 'day' | 'week' | 'month'): Promise<Statistics> {
  const previousData: Statistics = await fetchStatistics(hass, addDays(periodStart, -1), periodStart, entities, 'day');
  const data: Statistics = await fetchStatistics(hass, periodStart, periodEnd, entities, period);

  entities.forEach(entity => {
    let statsForEntity: StatisticValue[] = data[entity];
    let idx: number = 0;

    if (!statsForEntity || statsForEntity.length == 0 || statsForEntity[0].start > periodStart.getTime()) {
      let dummyStat: StatisticValue;

      if (previousData && previousData[entity] && previousData[entity].length != 0) {
        // This entry is the final stat prior to the period we are interested in.  It is only needed for the case where we need to calculate the
        // Live/Hybrid-mode state-delta at midnight on the current date (ie, before the first stat of the new day has been generated) so we do
        // not want to include its values in the stats calculations.
        const previousStat: StatisticValue = previousData[entity][0];

        dummyStat = {
          ...previousStat,
          change: 0,
          state: isTotalisingSensor(previousStat) ? previousStat.state : 0,
          mean: 100
        };
      } else {
        dummyStat = {
          change: 0,
          state: 0,
          sum: 0,
          start: periodStart.getTime(),
          end: periodEnd.getTime(),
          min: 0,
          mean: 100,
          max: 0,
          last_reset: null,
          statistic_id: entity
        };
      }

      if (statsForEntity) {
        statsForEntity.unshift(dummyStat);
      } else {
        statsForEntity = new Array(dummyStat);
      }

      idx++;
    }

    if (statsForEntity.length > idx) {
      let lastState: number = 0;

      statsForEntity.forEach(stat => {
        if (getHours(stat.start) == 0) {
          if (isMisconfiguredResettingSensor(stat)) {
            // this is a 'resetting' sensor which has been misconfigured such that the first 'change' value following the reset is out of range
            console.log("Entity " + entity + " is a misconfigured resetting sensor - change=" + stat.change + ", state=" + stat.state);
            stat.change = stat.state;
          } else if (isTotalisingSensor(stat)) {
            //console.log("Entity " + entity + " is a totalising sensor - change=" + stat[idx].change + ", state=" + stat[idx].state);
          } else {
            //console.log("Entity " + entity + " is a valid resetting sensor - change=" + stat[idx].change + ", state=" + stat[idx].state);
          }

          lastState = stat.state || 0;
        } else {
          // the 'change' values coming back from statistics are not always correct, so recalculate them from the state-diffs
          const state: number = stat.state || 0;
          stat.change = state - lastState;
          lastState = state;
        }
      });
    }
  });

  return data;
}

export function getEnergySourceColor(type: string) {
  if (type === 'solar') {
    return 'var(--warning-color)';
  }

  if (type === 'battery') {
    return 'var(--success-color)';
  }

  return undefined;
}

const isMisconfiguredResettingSensor = (stat: StatisticValue): boolean => {
  const change: number = round(stat.change || 0, 6);
  let state: number = round(stat.state || 0, 6);
  return change > state || change < 0;
};

const isTotalisingSensor = (stat: StatisticValue): boolean => {
  const change: number = round(stat.change || 0, 6);
  let state: number = round(stat.state || 0, 6);
  return change >= 0 && change < state;
};

const fetchStatistics = (hass: HomeAssistant, startTime: Date, endTime?: Date, statistic_ids?: string[], period: '5minute' | 'hour' | 'day' | 'week' | 'month' = 'hour') => hass.callWS<Statistics>({
  type: 'recorder/statistics_during_period',
  start_time: startTime.toISOString(),
  end_time: endTime?.toISOString(),
  statistic_ids: statistic_ids,
  period: period
});
