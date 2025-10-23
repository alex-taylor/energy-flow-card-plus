import { Collection } from "home-assistant-js-websocket";

export interface EntityRegistryEntry {
  id: string;
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  config_entry_id: string | null;
  device_id: string | null;
  area_id: string | null;
  disabled_by: 'user' | 'device' | 'integration' | 'config_entry' | null;
  hidden_by: Exclude<EntityRegistryEntry['disabled_by'], 'config_entry'>;
  entity_category: 'config' | 'diagnostic' | null;
  has_entity_name: boolean;
  original_name?: string;
  unique_id: string;
  translation_key?: string;
}

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
