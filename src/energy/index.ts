import { HomeAssistant } from 'custom-card-helpers';
import { EnergyCollection } from '@/hass';

export const getEnergyDataCollection = (hass: HomeAssistant, key: string = '_energy'): EnergyCollection | undefined => {
  return hass.connection[key];
};
