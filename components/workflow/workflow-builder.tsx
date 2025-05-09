'use client';

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
  PlusIcon,
  SaveIcon,
  Settings2Icon,
  XIcon,
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { WorkflowConfig } from '@/lib/types';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
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

  const { workcells, isLoading } = useWorkcells();

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedState);
        setNodes(savedNodes);
        setEdges(savedEdges);
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const state = {
        nodes,
        edges,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...edgeOptions }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedTask(node);
  }, []);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes(nodes => nodes.filter(node => node.id !== nodeId));
    setEdges(edges => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedTask?.id === nodeId) {
      setSelectedTask(null);
    }
  }, [setNodes, setEdges, selectedTask]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(z => Math.min(z + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(z => Math.max(z - 0.2, 0.2));
  }, []);

  const selectedWorkcell = workcells.find(w => w.id === selectedWorkcellId);
  const selectedInstrument = selectedWorkcell?.instruments[selectedInstrumentId];

  const isWorkcellSelectionDisabled = nodes.length > 0;

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
              return {
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
  }, [selectedInstrument, selectedInstrumentId, setNodes, nodes.length, onDeleteNode]);

  const generateWorkflowConfig = (): WorkflowConfig => {
    const tasks: Record<string, Task> = {};
    const instruments: Record<string, WorkflowInstrument> = {};
    const labware: Record<string, Labware> = {};

    nodes.forEach((node) => {
      // Add instruments
      if (node.data.instrument) {
        instruments[node.id] = {
          id: node.id,
          type: node.data.instrument.driver.name,
          capacity: node.data.instrument.driver.config.capacity || 1
        };
      }

      // Add tasks
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
            dependencies: [],
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

  const handleSave = () => {
    if (nodes.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one instrument to the workflow before saving.',
        variant: 'destructive'
      });
      return;
    }

    const config = generateWorkflowConfig();
    if (onSave) {
      onSave(config);
    }

    // Save to localStorage
    const state = {
      nodes,
      edges,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    toast({
      title: 'Success',
      description: 'Workflow saved successfully',
    });
  };

  const jsonOutput = useMemo(() => {
    const config = generateWorkflowConfig();
    return JSON.stringify(config, null, 2);
  }, [nodes, edges]);

  if (isLoading) {
    return <div>Loading workcells...</div>;
  }

  return (
    <ReactFlowProvider>
      <div className="h-[calc(100vh-8rem)] border rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
        <ResizablePanelGroup direction="horizontal">
          {showLeftPanel && (
            <>
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="h-full border-r">
                  <div className="p-4 border-b bg-card">
                    <h2 className="text-lg font-semibold">Workflow Builder</h2>
                    <p className="text-sm text-muted-foreground">Design your automation workflow</p>
                  </div>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Workcell</label>
                        <Select 
                          value={selectedWorkcellId} 
                          onValueChange={setSelectedWorkcellId}
                          disabled={isWorkcellSelectionDisabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a workcell" />
                          </SelectTrigger>
                          <SelectContent>
                            {workcells.map((workcell) => (
                              <SelectItem key={workcell.id} value={workcell.id}>
                                {workcell.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isWorkcellSelectionDisabled && (
                          <p className="text-xs text-muted-foreground">
                            Workcell cannot be changed after adding nodes
                          </p>
                        )}
                      </div>

                      {selectedWorkcell && (
                        <div className="space-y-4">
                          <Separator />
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Select Instrument</label>
                            <Select value={selectedInstrumentId} onValueChange={setSelectedInstrumentId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an instrument" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(selectedWorkcell.instruments).map(([id, instrument]) => (
                                  <SelectItem key={id} value={id}>
                                    {id} - {instrument.driver.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedInstrument && (
                            <div className="space-y-4">
                              <Button 
                                className="w-full" 
                                onClick={createInstrumentNode}
                                disabled={!selectedInstrument}
                              >
                                Add to Workflow
                              </Button>

                              {selectedTask && (
                                <>
                                  <Separator />
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Node Label</Label>
                                      <Input 
                                        value={selectedTask.data.label}
                                        onChange={(e) => {
                                          setNodes(nodes => nodes.map(node => 
                                            node.id === selectedTask.id 
                                              ? { ...node, data: { ...node.data, label: e.target.value } }
                                              : node
                                          ));
                                        }}
                                      />
                                    </div>

                                    <Collapsible open={isTaskListOpen} onOpenChange={setIsTaskListOpen}>
                                      <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="w-full flex items-center justify-between">
                                          <span>Available Tasks</span>
                                          {isTaskListOpen ? (
                                            <ChevronUpIcon className="h-4 w-4" />
                                          ) : (
                                            <ChevronDownIcon className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="space-y-2">
                                        {selectedTask.data.instrument.driver.tasks?.map(task => (
                                          <Card key={task.name} className="p-2">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="font-medium text-sm">{task.name}</div>
                                                <div className="text-xs text-muted-foreground">{task.description}</div>
                                              </div>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => selectedTask.data.onTaskSelect(task.name)}
                                                disabled={selectedTask.data.selectedTasks.includes(task.name)}
                                              >
                                                Add
                                              </Button>
                                            </div>
                                          </Card>
                                        ))}
                                      </CollapsibleContent>
                                    </Collapsible>

                                    <div className="space-y-2">
                                      {renderSelectedTasks()}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle>
                <GripVerticalIcon className="h-4 w-4" />
              </ResizableHandle>
            </>
          )}
          
          <ResizablePanel defaultSize={showRightPanel ? 50 : 75}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={edgeOptions}
              minZoom={0.2}
              maxZoom={2}
              defaultZoom={1}
              fitView
            >
              <Background 
                variant="dots"
                gap={12}
                size={1}
                color="hsl(var(--muted-foreground))"
                className="opacity-5"
              />
              <Controls 
                className="bg-background/80 backdrop-blur-sm border rounded-lg p-2"
                showInteractive={false}
              />
              <MiniMap 
                nodeColor={(node) => {
                  switch (node.data?.taskType) {
                    case 'instrument': return 'hsl(var(--primary))';
                    default: return 'hsl(var(--muted-foreground))';
                  }
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
                className="bg-background/80 backdrop-blur-sm rounded-lg"
              />
              
              <Panel position="top-right" className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <MinusIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowLeftPanel(!showLeftPanel)}>
                  {showLeftPanel ? <PanelLeftIcon className="h-4 w-4" /> : <PanelRightIcon className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowRightPanel(!showRightPanel)}>
                  <FileJsonIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleSave}>
                  <SaveIcon className="h-4 w-4" />
                </Button>
              </Panel>
            </ReactFlow>
          </ResizablePanel>

          {showRightPanel && (
            <>
              <ResizableHandle withHandle>
                <GripVerticalIcon className="h-4 w-4" />
              </ResizableHandle>
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="h-full border-l">
                  <div className="p-4 border-b bg-card">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Flow JSON</h2>
                      <Button variant="ghost" size="icon" onClick={() => setShowRightPanel(false)}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                      {jsonOutput}
                    </pre>
                  </ScrollArea>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </ReactFlowProvider>
  );
}