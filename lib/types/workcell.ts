export interface DriverConfig {
  name: string;
  version: string;
  config: Record<string, any>;
  group: string;
}

export interface InstrumentAttributes {
  capacity?: number;
  slots?: Array<{
    name: string;
    type: string;
    position?: {
      x: number;
      y: number;
      z: number;
    };
  }>;
  location?: {
    x: number;
    y: number;
    z: number;
  };
  status: 'available' | 'busy' | 'error' | 'offline' | 'maintenance';
}

export interface InstrumentInput {
  id: string;
  name: string;
  driver: DriverConfig;
  group: string;
  attributes?: InstrumentAttributes;
}

export interface Instrument {
  id: string;
  name: string;
  driver: DriverConfig;
  group: string;
  attributes?: InstrumentAttributes;
}

export interface WorkcellInput {
  name: string;
  instruments: Record<string, InstrumentInput>;
}

export interface Workcell {
  id: string;
  name: string;
  instruments: Record<string, Instrument>;
  created_at: string;
  updated_at: string;
}

export interface WorkcellListResponse {
  items: Workcell[];
  total: number;
}

export interface ExecuteActionInput {
  action: string;
  arguments: Record<string, any>;
}