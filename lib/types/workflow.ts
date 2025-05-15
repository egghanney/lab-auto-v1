import { z } from 'zod';

export interface LabwareLocation {
  instrument_id: string;
  slot: number;
}

export interface Labware {
  id: string;
  name: string;
  starting_location: LabwareLocation;
}

export interface TaskLabware {
  id: string;
  name: string;
  initial_slot: number;
  final_slot: number;
  quantity: number;
}

export interface BaseAction {
  id: string;
  name: string;
  instrument_group: string;
  duration: number;
  dependencies: string[];
  parameters: Record<string, any>;
}

export interface ActionWithLabware extends BaseAction {
  required_labware: Record<string, TaskLabware>;
}

export type Action = BaseAction | ActionWithLabware;

export interface WorkflowInstrumentGroup {
  id: string;
  name: string;
  instruments: string[];
}

export interface History {
  action_id: string;
  instrument_id: string;
  start: number;
  end: number;
}

export interface TimeConstraint {
  type: 'START_TO_START' | 'START_TO_END' | 'END_TO_START' | 'END_TO_END';
  start_action: string;
  end_action: string;
  duration: number;
}

export interface WorkflowConfig {
  actions: Record<string, Action>;
  instrument_groups: Record<string, WorkflowInstrumentGroup>;
  labware: Record<string, Labware>;
  history: Record<string, History>;
  time_constraints: TimeConstraint[];
}

export interface WorkflowInput {
  name: string;
  workcell_id: string;
  config: WorkflowConfig;
}

export interface Workflow {
  id: string;
  name: string;
  workcell_id: string;
  config: WorkflowConfig;
  created_at: string;
  updated_at: string;
}

export interface WorkflowListResponse {
  items: Workflow[];
  total: number;
}

export const actionSchema = z.object({
  id: z.string(),
  name: z.string(),
  instrument_group: z.string(),
  duration: z.number(),
  dependencies: z.array(z.string()),
  parameters: z.record(z.any()),
  required_labware: z.record(z.object({
    id: z.string(),
    name: z.string(),
    initial_slot: z.number(),
    final_slot: z.number(),
    quantity: z.number().default(1),
  })).optional(),
});

export type ActionSchema = z.infer<typeof actionSchema>;