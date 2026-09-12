/**
 * FastF1 Telemetry Integration & REST Bridge Service
 *
 * Provides a standardized data contract for FastF1 (Python) race telemetry ingestion.
 *
 * ARCHITECTURAL CLARIFICATION:
 * FastF1 is an open-source Python telemetry analysis library that runs in Python (C-extensions,
 * pandas, numpy, and disk cache). It CANNOT run inside browser JavaScript directly.
 *
 * All data access is mediated through the RaceDataProvider interface:
 * - DemoRaceDataProvider (default in-browser demo dataset)
 * - FastF1HttpRaceDataProvider (connects to a local/remote Python FastF1 REST API service)
 */

export * from './raceDataProvider';
import {
  getRaceDataProvider,
  setRaceDataProvider,
  FastF1HttpRaceDataProvider,
  PYTHON_FASTF1_BACKEND_CODE,
} from './raceDataProvider';

export interface FastF1EndpointConfig {
  baseUrl: string;
  useDemoData: boolean;
  apiKey?: string;
  cacheTtlMs: number;
}

export const defaultFastF1Config: FastF1EndpointConfig = {
  baseUrl: '/api/fastf1',
  useDemoData: true,
  cacheTtlMs: 60000,
};

export class FastF1Bridge {
  private config: FastF1EndpointConfig;

  constructor(config: Partial<FastF1EndpointConfig> = {}) {
    this.config = { ...defaultFastF1Config, ...config };
  }

  /**
   * Healthcheck for FastF1 Python Telemetry Ingestion Daemon
   */
  async checkStatus(): Promise<{ status: 'CONNECTED' | 'DEMO_STANDBY' | 'FALLBACK'; latencyMs: number; node: string; notes: string }> {
    const provider = getRaceDataProvider();
    const status = await provider.getProviderStatus();

    return {
      status: provider.isDemo ? 'DEMO_STANDBY' : status.status === 'ONLINE' ? 'CONNECTED' : 'FALLBACK',
      latencyMs: status.latencyMs,
      node: provider.providerName,
      notes: status.notes,
    };
  }

  /**
   * Switch active data provider
   */
  connectToPythonFastF1(baseUrl: string = 'http://localhost:8000/api/fastf1'): void {
    setRaceDataProvider(new FastF1HttpRaceDataProvider({ baseUrl }));
  }

  /**
   * Documentation and source code of the Python FastF1 script that implements the backend
   */
  getPythonIngestionSpec(): string {
    return PYTHON_FASTF1_BACKEND_CODE;
  }
}

export const fastf1Bridge = new FastF1Bridge();

