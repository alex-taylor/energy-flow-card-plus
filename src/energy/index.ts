/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HomeAssistant } from 'custom-card-helpers';
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

const fetchStatistics = (
  hass: HomeAssistant,
  startTime: Date,
  endTime?: Date,
  statistic_ids?: string[],
  period: '5minute' | 'hour' | 'day' | 'week' | 'month' = 'hour'
) =>
  hass.callWS<Statistics>({
    type: 'recorder/statistics_during_period',
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString(),
    statistic_ids,
    period
  });

export async function getStatistics(hass: HomeAssistant, periodStart: Date, periodEnd: Date, entities: string[], period: '5minute' | 'hour' | 'day' | 'week' | 'month'): Promise<Statistics> {
  const data: Statistics = await fetchStatistics(
    hass,
    periodStart,
    periodEnd,
    entities,
    period
  );

  // if the first stat is after the start of our requested period, fake one up
  Object.values(data).forEach(stat => {
    if (stat.length != 0 && stat[0].start > periodStart.getTime()) {
      stat.unshift({
        ...stat[0],
        start: periodStart.getTime(),
        end: periodStart.getTime(),
        sum: 0,
        state: (stat[0].state ?? 0) - (stat[0].change ?? 0),
        change: 0
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
