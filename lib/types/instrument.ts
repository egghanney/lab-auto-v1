import { z } from 'zod';

export interface DriverTask {
  name: string;
  description: string;
  parameters: string[];
  group?: string;
}

export interface DriverOption {
  name: string;
  versions: string[];
  description: string;
  tasks: DriverTask[];
  group: string;
}

export const driverOptions: DriverOption[] = [
  {
    name: 'RobotArm',
    versions: ['1.0.0', '1.1.0', '2.0.0'],
    description: 'Robotic arm for labware transport',
    group: 'Transport',
    tasks: [
      { 
        name: 'initialize_instrument', 
        description: 'Initialize the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'calibrate_instrument', 
        description: 'Calibrate the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'pickup', 
        description: 'Pick up labware from a location', 
        parameters: ['source_position'],
        group: 'Movement'
      },
      { 
        name: 'place', 
        description: 'Place labware at a location', 
        parameters: ['target_position'],
        group: 'Movement'
      },
      { 
        name: 'home_instrument', 
        description: 'Move to home position', 
        parameters: [],
        group: 'Movement'
      },
      { 
        name: 'move_to_home', 
        description: 'Return to home position', 
        parameters: [],
        group: 'Movement'
      },
      { 
        name: 'move_to', 
        description: 'Move to specific coordinates', 
        parameters: ['x', 'y', 'z'],
        group: 'Movement'
      },
      { 
        name: 'pause_task', 
        description: 'Pause current task', 
        parameters: [],
        group: 'Control'
      },
      { 
        name: 'resume_task', 
        description: 'Resume paused task', 
        parameters: [],
        group: 'Control'
      }
    ]
  },
  {
    name: 'PipettingRobot',
    versions: ['2.0.0', '2.1.0', '2.2.0'],
    description: '8-channel liquid handling robot',
    group: 'Liquid Handlers',
    tasks: [
      { 
        name: 'initialize_instrument', 
        description: 'Initialize the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'calibrate_instrument', 
        description: 'Calibrate the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'aspirate_liquid', 
        description: 'Aspirate liquid', 
        parameters: ['volume', 'flow_rate'],
        group: 'Liquid Handling'
      },
      { 
        name: 'dispense_liquid', 
        description: 'Dispense liquid', 
        parameters: ['volume', 'flow_rate'],
        group: 'Liquid Handling'
      },
      { 
        name: 'mix_liquid', 
        description: 'Mix liquid by repeated aspiration/dispense', 
        parameters: ['volume', 'repetitions'],
        group: 'Liquid Handling'
      },
      { 
        name: 'transfer_liquid', 
        description: 'Transfer liquid between positions', 
        parameters: ['volume', 'source', 'destination'],
        group: 'Liquid Handling'
      },
      { 
        name: 'touch_tip', 
        description: 'Touch tip to remove droplets', 
        parameters: ['location'],
        group: 'Liquid Handling'
      },
      { 
        name: 'blow_out', 
        description: 'Blow out any remaining liquid', 
        parameters: [],
        group: 'Liquid Handling'
      },
      { 
        name: 'load_tip', 
        description: 'Load a new pipette tip', 
        parameters: ['tip_location'],
        group: 'Tips'
      },
      { 
        name: 'eject_tip', 
        description: 'Eject current pipette tip', 
        parameters: ['waste_location'],
        group: 'Tips'
      }
    ]
  },
  {
    name: 'Thermocycler',
    versions: ['3.0.0', '3.1.0'],
    description: 'PCR thermal cycler',
    group: 'Temperature Control',
    tasks: [
      { 
        name: 'initialize_instrument', 
        description: 'Initialize the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'calibrate_instrument', 
        description: 'Calibrate the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'set_temperature', 
        description: 'Set block temperature', 
        parameters: ['temperature', 'hold_time'],
        group: 'Temperature'
      },
      { 
        name: 'run_protocol', 
        description: 'Run thermal profile', 
        parameters: ['profile_name'],
        group: 'Protocol'
      },
      { 
        name: 'heat', 
        description: 'Heat to target temperature', 
        parameters: ['temperature', 'rate'],
        group: 'Temperature'
      },
      { 
        name: 'cool', 
        description: 'Cool to target temperature', 
        parameters: ['temperature', 'rate'],
        group: 'Temperature'
      },
      { 
        name: 'open_lid', 
        description: 'Open the lid', 
        parameters: [],
        group: 'Control'
      },
      { 
        name: 'close_lid', 
        description: 'Close the lid', 
        parameters: [],
        group: 'Control'
      },
      { 
        name: 'wait', 
        description: 'Wait for specified duration', 
        parameters: ['duration'],
        group: 'Control'
      }
    ]
  },
  {
    name: 'PlateReader',
    versions: ['2.0.0', '2.1.0'],
    description: 'Microplate absorbance reader',
    group: 'Detection',
    tasks: [
      { 
        name: 'initialize_instrument', 
        description: 'Initialize the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'calibrate_instrument', 
        description: 'Calibrate the instrument', 
        parameters: [],
        group: 'Setup'
      },
      { 
        name: 'read_absorbance', 
        description: 'Measure absorbance', 
        parameters: ['wavelength'],
        group: 'Measurement'
      },
      { 
        name: 'read_fluorescence', 
        description: 'Measure fluorescence', 
        parameters: ['excitation', 'emission'],
        group: 'Measurement'
      },
      { 
        name: 'shake', 
        description: 'Shake plate', 
        parameters: ['speed', 'time'],
        group: 'Control'
      },
      { 
        name: 'wait', 
        description: 'Wait for specified duration', 
        parameters: ['duration'],
        group: 'Control'
      }
    ]
  }
];

// Schema for instrument attributes
export const instrumentAttributesSchema = z.object({
  capacity: z.number().optional(),
  slots: z.array(z.object({
    name: z.string(),
    type: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    }).optional()
  })).optional(),
  location: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }).optional(),
  status: z.enum(['available', 'busy', 'error', 'offline', 'maintenance']).default('available')
});

export type InstrumentAttributes = z.infer<typeof instrumentAttributesSchema>;

// Schema for instrument group
export const instrumentGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

export type InstrumentGroup = z.infer<typeof instrumentGroupSchema>;

// Get unique groups from driver options
export const getInstrumentGroups = () => {
  const groups = new Set(driverOptions.map(driver => driver.group));
  return Array.from(groups).sort();
};

// Get unique task groups
export const getTaskGroups = (driverName: string) => {
  const driver = driverOptions.find(d => d.name === driverName);
  if (!driver) return [];
  
  const groups = new Set(driver.tasks.map(task => task.group || 'Other'));
  return Array.from(groups).sort();
};

// Get drivers by group
export const getDriversByGroup = (group: string) => {
  return driverOptions.filter(driver => driver.group === group);
};

// Get tasks by group
export const getTasksByGroup = (driverName: string, group: string) => {
  const driver = driverOptions.find(d => d.name === driverName);
  if (!driver) return [];
  
  return driver.tasks.filter(task => (task.group || 'Other') === group);
};