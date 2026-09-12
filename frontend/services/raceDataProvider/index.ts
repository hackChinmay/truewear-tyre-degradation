import { DemoRaceDataProvider, demoRaceDataProvider } from './demoProvider';
import { FastF1HttpRaceDataProvider } from './fastf1HttpProvider';
import { LiveOpenF1DataProvider } from './liveOpenF1Provider';
import { RaceDataProvider } from './types';

export * from './types';
export * from './demoProvider';
export * from './fastf1HttpProvider';
export * from './liveOpenF1Provider';
export * from './pythonServerSpec';

// Default to Live FastF1 / OpenF1 Live FIA Telemetry & Timing API
const defaultFastF1Provider = new LiveOpenF1DataProvider();

let activeProvider: RaceDataProvider = defaultFastF1Provider;

/**
 * Returns the currently configured RaceDataProvider.
 * Defaults to FastF1HttpRaceDataProvider.
 */
export function getRaceDataProvider(): RaceDataProvider {
  return activeProvider;
}

/**
 * Switch the active RaceDataProvider.
 *
 * Example:
 *   setRaceDataProvider(new FastF1HttpRaceDataProvider({ baseUrl: 'http://localhost:8000' }))
 */
export function setRaceDataProvider(provider: RaceDataProvider): void {
  activeProvider = provider;
}
