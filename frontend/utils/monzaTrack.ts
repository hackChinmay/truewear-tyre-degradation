export type { TrackPointTelemetry } from './circuitTrackData';
import { getCircuitConfig, getCircuitTrackTelemetry, TrackPointTelemetry } from './circuitTrackData';

export const MONZA_WAYPOINTS: TrackPointTelemetry[] = getCircuitConfig('monza').waypoints;

export function getMonzaTrackTelemetry(fraction: number): TrackPointTelemetry {
  return getCircuitTrackTelemetry('monza', fraction);
}
