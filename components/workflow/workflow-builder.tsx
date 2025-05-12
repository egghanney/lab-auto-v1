import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeTypes,
  NodeTypes,
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import TaskNode from './task-node';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  FileJsonIcon, 
  GripVerticalIcon, 
  MinusIcon,
  PanelLeftIcon, 
  PanelRightIcon, 
  PlayIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  Settings2Icon,
  XIcon,
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { WorkflowConfig } from '@/lib/types';
import {
  ResizableHandle,
  ResizablePanelGroup,
  ResizablePanel,
} from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useWorkcells } from '@/lib/hooks/use-workcells';
import { Badge } from '../ui/badge';
import { driverOptions } from '@/lib/types/instrument';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { labwareOptions } from '@/lib/types/labware';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Switch } from '../ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface WorkflowBuilderProps {
  initialWorkflow?: WorkflowConfig;
  onSave?: (workflow: WorkflowConfig) => void;
}

const nodeTypes: NodeTypes = {
  task: TaskNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const STORAGE_KEY = 'workflow_builder_state';

const edgeOptions = {
  animated: true,
  style: {
    strokeWidth: 2,
    stroke: 'hsl(var(--primary))',
  },
};

export default function WorkflowBuilder({ initialWorkflow, onSave }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Node | null>(null);
  const [selectedWorkcellId, setSelectedWorkcellId] = useState<string>('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isTaskListOpen, setIsTaskListOpen] = useState(true);
  const [openTaskLabware, setOpenTaskLabware] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const { workcells, isLoading } = useWorkcells();

  // Update workflow configuration whenever nodes or edges change
  useEffect(() => {
    if (!selectedWorkcell || nodes.length === 0) return;

    const config = generateWorkflowConfig();
    if (onSave) {
      onSave(config);
    }
  }, [nodes, edges, selectedWorkcell, onSave]);

  const createInstrumentNode = useCallback(() => {
    if (!selectedInstrument) return;

    const nodeCount = nodes.length;
    const position = {
      x: 100 + (nodeCount * 50),
      y: 100 + (nodeCount * 50)
    };

    const nodeId = `${selectedInstrumentId}-${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
      type: 'task',
      position,
      data: {
        label: selectedInstrumentId,
        taskType: 'instrument',
        instrument: {
          ...selectedInstrument,
          driver: {
            ...selectedInstrument.driver,
            tasks: driverOptions.find(d => d.name === selectedInstrument.driver.name)?.tasks || []
          }
        },
        selectedTasks: [],
        selectedLabware: {},
        labwareConfig: {},
        onTaskSelect: (taskName: string) => {
          setNodes(nodes => nodes.map(node => {
            if (node.id === nodeId) {
              const updatedNode = {
                ...node,
                data: {
                  ...node.data,
                  selectedTasks: [...(node.data.selectedTasks || []), taskName],
                  selectedLabware: {
                    ...node.data.selectedLabware,
                    [taskName]: []
                  }
                }
              };
              return updatedNode;
            }
            return node;
          }));
        },
        onTaskRemove: (taskName: string) => {
          setNodes(nodes => nodes.map(node => {
            if (node.id === nodeId) {
              const { [taskName]: removed, ...remainingLabware } = node.data.selectedLabware;
              const { [taskName]: removedConfig, ...remainingConfig } = node.data.labwareConfig || {};
              return {
                ...node,
                data: {
                  ...node.data,
                  selectedTasks: node.data.selectedTasks.filter(t => t !== taskName),
                  selectedLabware: remainingLabware,
                  labwareConfig: remainingConfig
                }
              };
            }
            return node;
          }));
        },
        onLabwareSelect: (taskName: string, labwareId: string) => {
          setNodes(nodes => nodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  selectedLabware: {
                    ...node.data.selectedLabware,
                    [taskName]: [...(node.data.selectedLabware[taskName] || []), labwareId]
                  },
                  labwareConfig: {
                    ...node.data.labwareConfig,
                    [taskName]: {
                      ...(node.data.labwareConfig?.[taskName] || {}),
                      [labwareId]: {
                        type: labwareOptions.find(l => l.id === labwareId)?.type || '',
                        slot: 1,
                        maxVolume: 0,
                        initialVolume: 0,
                        temperature: 25,
                        isSealed: false,
                        reagentMapping: {},
                        compatibleInstruments: [],
                        isReadOnly: false,
                        taskAssignment: [],
                        capacityUsed: 0
                      }
                    }
                  }
                }
              };
            }
            return node;
          }));
        },
        onLabwareRemove: (taskName: string, labwareId: string) => {
          setNodes(nodes => nodes.map(node => {
            if (node.id === nodeId) {
              const { [labwareId]: removedConfig, ...remainingConfig } = node.data.labwareConfig?.[taskName] || {};
              return {
                ...node,
                data: {
                  ...node.data,
                  selectedLabware: {
                    ...node.data.selectedLabware,
                    [taskName]: node.data.selectedLabware[taskName].filter(id => id !== labwareId)
                  },
                  labwareConfig: {
                    ...node.data.labwareConfig,
                    [taskName]: remainingConfig
                  }
                }
              };
            }
            return node;
          }));
        },
        onLabwareConfigUpdate: (taskName: string, labwareId: string, config: any) => {
          setNodes(nodes => nodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  labwareConfig: {
                    ...node.data.labwareConfig,
                    [taskName]: {
                      ...(node.data.labwareConfig?.[taskName] || {}),
                      [labwareId]: config
                    }
                  }
                }
              };
            }
            return node;
          }));
        },
        onDelete: () => onDeleteNode(nodeId)
      }
    };

    setNodes(nodes => [...nodes, newNode]);
  }, [selectedInstrument, selectedInstrumentId, setNodes]);

  const generateWorkflowConfig = (): WorkflowConfig => {
    const tasks: Record<string, Task> = {};
    const instruments: Record<string, WorkflowInstrument> = {};
    const labware: Record<string, Labware> = {};

    nodes.forEach((node) => {
      if (node.data.instrument) {
        // Add instrument configuration
        instruments[node.id] = {
          id: node.id,
          type: node.data.instrument.driver.name,
          capacity: node.data.instrument.driver.config.capacity || 1
        };

        // Add tasks for this instrument
        node.data.selectedTasks?.forEach((taskName: string) => {
          const taskId = `${node.id}-${taskName}`;
          const task = node.data.instrument.driver.tasks?.find((t: any) => t.name === taskName);
          
          if (task) {
            const selectedLabware = node.data.selectedLabware[taskName] || [];
            const labwareConfig = node.data.labwareConfig?.[taskName] || {};

            // Create task configuration
            const taskConfig: ActionTask = {
              id: taskId,
              instrument_type: node.data.instrument.driver.name,
              duration: task.duration || 10,
              dependencies: [], // Dependencies will be added based on edges
              arguments: {},
              action: taskName,
              required_labware: {}
            };

            // Add labware configurations
            selectedLabware.forEach((labwareId: string) => {
              const config = labwareConfig[labwareId] || {};
              
              taskConfig.required_labware[labwareId] = {
                id: labwareId,
                initial_slot: config.slot || 1,
                final_slot: config.slot || 1,
                quantity: 1
              };

              // Add labware to global labware config if not exists
              if (!labware[labwareId]) {
                labware[labwareId] = {
                  id: labwareId,
                  starting_location: {
                    instrument_id: node.id,
                    slot: config.slot || 1
                  }
                };
              }
            });

            tasks[taskId] = taskConfig;
          }
        });
      }
    });

    // Add dependencies based on edges
    edges.forEach((edge) => {
      const targetTask = tasks[edge.target];
      if (targetTask && !targetTask.dependencies.includes(edge.source)) {
        targetTask.dependencies.push(edge.source);
      }
    });

    return {
      tasks,
      instruments,
      labware,
      history: {},
      time_constraints: [],
      instrument_blocks: []
    };
  };

  // ... (rest of the component implementation remains the same as in the original file)
}