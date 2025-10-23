/* eslint-disable no-console */
import { debounce } from 'custom-card-helpers';
import { version } from '../package.json';

// Log Version
console.groupCollapsed(`%c⚡ Energy Flow Card Extended v${version} is installed`, 'color: #488fc2; font-weight: bold');
console.log('Readme:', 'https://github.com/alex-taylor/energy-flow-card-plus');
console.groupEnd();

export const logError = debounce((error: string) => {
  console.error(
    `%c⚡ Energy Flow Card Extended v${version} %cError: ${error}`,
    'font-weight: bold',
    'color: #b33a3a; font-weight: normal'
  );
}, 60000);

export const logDebug = (message: string) => {
  console.debug(
    `%c⚡ Energy Flow Card Extended v${version} %c${message}`,
    'font-weight: bold',
    'font-weight: normal'
  );
};
