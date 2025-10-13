/* eslint-disable @typescript-eslint/no-explicit-any */
import { logError } from "../logging";

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export function isNumberValue(value: any): boolean {
  // parseFloat(value) handles most of the cases we're interested in (it treats null, empty string,
  // and other non-number values as NaN, where Number just uses 0) but it considers the string
  // '123hello' to be a valid number. Therefore we also check if Number(value) is NaN.
  // eslint-disable-next-line no-restricted-globals
  return !isNaN(parseFloat(value as any)) && !isNaN(Number(value));
}

export function coerceNumber(value: any): number;

export function coerceNumber<D>(value: any, fallback: D): number | D;

export function coerceNumber(value: any, fallbackValue = 0) {
  return isNumberValue(value) ? Number(value) : fallbackValue;
}

export const mapRange = (value: number, minOut: number, maxOut: number, minIn: number, maxIn: number): number => {
  if (value > maxIn) {
    return maxOut;
  }

  return ((value - minIn) * (maxOut - minOut)) / (maxIn - minIn) + minOut;
};

export const unavailableOrMisconfiguredError = (entityId: string | undefined) => logError(`Entity "${entityId ?? "Unknown"}" is not available or misconfigured`);

export const clampStateValue = (value: number, tolerance: number | undefined): number => {
  if (tolerance !== undefined && tolerance >= value) {
    return 0;
  }

  return value;
};
