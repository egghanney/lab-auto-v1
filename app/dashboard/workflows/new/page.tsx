'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { WorkflowConfig, WorkflowInput, Workflow } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

const WorkflowBuilder = dynamic(
  () => import('@/components/workflow/workflow-builder'),
  { ssr: false }
);

const STORAGE_KEY = 'lab_workflows';

// Sample workflows for demonstration
const sampleWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'DNA Extraction Protocol',
    config: {
      tasks: {
        'pickup_samples': {
          id: 'pickup_samples',
          instrument_type: 'RobotArm',
          duration: 30,
          dependencies: [],
          arguments: {},
          labware_id: 'microplate_96',
          destination_slot: 1,
          source_task: null
        },
        'liquid_handling': {
          id: 'liquid_handling',
          instrument_type: 'PipettingRobot',
          duration: 300,
          dependencies: ['pickup_samples'],
          arguments: {
            volume: 100,
            flow_rate: 150
          },
          action: 'transfer_liquid',
          required_labware: {
            'microplate_96': {
              id: 'microplate_96',
              initial_slot: 1,
              final_slot: 1,
              quantity: 1
            }
          }
        }
      },
      instruments: {
        'robot_arm': {
          id: 'robot_arm',
          type: 'RobotArm',
          capacity: 2
        },
        'pipettor': {
          id: 'pipettor',
          type: 'PipettingRobot',
          capacity: 8
        }
      },
      labware: {
        'microplate_96': {
          id: 'microplate_96',
          starting_location: {
            instrument_id: 'robot_arm',
            slot: 1
          }
        }
      },
      history: {},
      time_constraints: [],
      instrument_blocks: []
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'PCR Setup',
    config: {
      tasks: {
        'get_reagents': {
          id: 'get_reagents',
          instrument_type: 'RobotArm',
          duration: 45,
          dependencies: [],
          arguments: {},
          labware_id: 'deepwell_24',
          destination_slot: 1,
          source_task: null
        },
        'mix_pcr': {
          id: 'mix_pcr',
          instrument_type: 'PipettingRobot',
          duration: 180,
          dependencies: ['get_reagents'],
          arguments: {
            volume: 50,
            repetitions: 3
          },
          action: 'mix_liquid',
          required_labware: {
            'deepwell_24': {
              id: 'deepwell_24',
              initial_slot: 1,
              final_slot: 1,
              quantity: 1
            }
          }
        },
        'run_pcr': {
          id: 'run_pcr',
          instrument_type: 'Thermocycler',
          duration: 3600,
          dependencies: ['mix_pcr'],
          arguments: {
            profile_name: 'standard_pcr'
          },
          action: 'run_protocol',
          required_labware: {
            'deepwell_24': {
              id: 'deepwell_24',
              initial_slot: 1,
              final_slot: 1,
              quantity: 1
            }
          }
        }
      },
      instruments: {
        'robot_arm': {
          id: 'robot_arm',
          type: 'RobotArm',
          capacity: 2
        },
        'pipettor': {
          id: 'pipettor',
          type: 'PipettingRobot',
          capacity: 8
        },
        'thermocycler': {
          id: 'thermocycler',
          type: 'Thermocycler',
          capacity: 1
        }
      },
      labware: {
        'deepwell_24': {
          id: 'deepwell_24',
          starting_location: {
            instrument_id: 'robot_arm',
            slot: 1
          }
        }
      },
      history: {},
      time_constraints: [],
      instrument_blocks: []
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function NewWorkflowPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('Untitled Workflow');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);

  useEffect(() => {
    setMounted(true);

    // Initialize sample workflows if none exist
    const existingWorkflows = localStorage.getItem(STORAGE_KEY);
    if (!existingWorkflows) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleWorkflows));
    }
  }, []);

  const handleSave = async () => {
    if (!workflowConfig) {
      toast({
        title: 'Error',
        description: 'Please create a workflow before saving',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const newWorkflow: Workflow = {
        id: crypto.randomUUID(),
        name,
        config: workflowConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Get existing workflows
      const existingWorkflows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      
      // Add new workflow
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...existingWorkflows, newWorkflow]));
      
      toast({
        title: 'Success',
        description: 'Workflow saved successfully',
      });
      
      router.push('/dashboard/workflows');
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to save workflow. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/workflows">
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          {isEditing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditing(false);
                }
              }}
              className="text-2xl font-bold h-auto py-1 px-2 w-auto min-w-[300px]"
              autoFocus
            />
          ) : (
            <h1 
              className="text-3xl font-bold tracking-tight cursor-pointer hover:bg-accent hover:bg-opacity-50 rounded px-2 py-1"
              onClick={() => setIsEditing(true)}
            >
              {name}
            </h1>
          )}
        </div>
        <Button disabled={isSaving} onClick={handleSave}>
          <SaveIcon className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Workflow'}
        </Button>
      </div>

      <div className="space-y-2">
        <WorkflowBuilder 
          onSave={(config) => setWorkflowConfig(config)} 
        />
      </div>
    </div>
  );
}