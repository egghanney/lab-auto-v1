'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  BeakerIcon,
  ThermometerIcon,
  ShieldIcon,
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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedWorkcellId, setSelectedWorkcellId] = useState<string>('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const router = useRouter();

  const { workcells, isLoading } = useWorkcells();
  const selectedWorkcell = workcells.find(w => w.id === selectedWorkcellId);

  const instrumentGroups = useMemo(() => {
    if (!selectedWorkcell) return [];
    
    const groups = new Set(
      Object.values(selectedWorkcell.instruments).map(i => i.driver.group)
    );
    return Array.from(groups);
  }, [selectedWorkcell]);

  const instrumentsByGroup = useMemo(() => {
    if (!selectedWorkcell) return {};
    
    return Object.entries(selectedWorkcell.instruments).reduce((acc, [id, instrument]) => {
      const group = instrument.driver.group;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push({ id, ...instrument });
      return acc;
    }, {} as Record<string, any[]>);
  }, [selectedWorkcell]);

  const onDragStart = (event: React.DragEvent, group: string) => {
    event.dataTransfer.setData('application/instrumentGroup', group);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const group = event.dataTransfer.getData('application/instrumentGroup');
      if (!group || !selectedWorkcell) return;

      const instruments = instrumentsByGroup[group];
      if (!instruments?.length) return;

      const { clientX, clientY } = event;
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: clientX - reactFlowBounds.left,
        y: clientY - reactFlowBounds.top,
      };

      const nodeId = `${group}-${Date.now()}`;
      const newNode: Node = {
        id: nodeId,
        type: 'task',
        position,
        data: {
          label: group,
          taskType: 'instrument',
          instrument: {
            group,
            instruments: instruments,
            driver: {
              tasks: driverOptions.find(d => d.name === instruments[0].driver.name)?.tasks || []
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
                const currentLabware = node.data.selectedLabware[taskName] || [];
                return {
                  ...node,
                  data: {
                    ...node.data,
                    selectedLabware: {
                      ...node.data.selectedLabware,
                      [taskName]: [...currentLabware, labwareId]
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
                const currentLabware = node.data.selectedLabware[taskName] || [];
                const { [taskName]: removedConfig, ...remainingConfig } = node.data.labwareConfig || {};
                return {
                  ...node,
                  data: {
                    ...node.data,
                    selectedLabware: {
                      ...node.data.selectedLabware,
                      [taskName]: currentLabware.filter(id => id !== labwareId)
                    },
                    labwareConfig: {
                      ...remainingConfig,
                      [taskName]: Object.fromEntries(
                        Object.entries(removedConfig || {}).filter(([key]) => key !== labwareId)
                      )
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
      setSelectedNode(newNode);
      setExpandedGroups(new Set([...expandedGroups, group]));
    },
    [selectedWorkcell, instrumentsByGroup, setNodes, expandedGroups]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...edgeOptions }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    if (node.data.instrument?.group) {
      setExpandedGroups(new Set([...expandedGroups, node.data.instrument.group]));
    }
  }, [expandedGroups]);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes(nodes => nodes.filter(node => node.id !== nodeId));
    setEdges(edges => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(z => Math.min(z + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(z => Math.max(z - 0.2, 0.2));
  }, []);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const getWorkflowJson = useCallback(() => {
    const workflow: WorkflowConfig = {
      tasks: {},
      instruments: {},
      labware: {},
      history: {},
      time_constraints: [],
      instrument_blocks: []
    };

    nodes.forEach(node => {
      const { selectedTasks, selectedLabware, labwareConfig } = node.data;
      selectedTasks.forEach((taskName: string) => {
        const taskId = `${node.id}-${taskName}`;
        workflow.tasks[taskId] = {
          id: taskId,
          instrument_type: node.data.instrument.group,
          duration: 5,
          dependencies: [],
          arguments: {},
          action: taskName,
          required_labware: {}
        };

        if (selectedLabware[taskName]) {
          selectedLabware[taskName].forEach((labwareId: string) => {
            const config = labwareConfig?.[taskName]?.[labwareId];
            if (config) {
              workflow.tasks[taskId].required_labware[labwareId] = {
                id: labwareId,
                initial_slot: config.slot,
                final_slot: config.slot,
                quantity: 1
              };
            }
          });
        }
      });
    });

    return workflow;
  }, [nodes]);

  const isWorkcellSelectionDisabled = nodes.length > 0;

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
                        <Label>Select Workcell</Label>
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
                      </div>

                      {selectedWorkcell && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <Label>Available Instrument Groups</Label>
                            <div className="space-y-2">
                              {instrumentGroups.map(group => (
                                <Card
                                  key={group}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, group)}
                                  className="cursor-move hover:shadow-md transition-all"
                                >
                                  <CardHeader className="p-3">
                                    <CardTitle className="text-sm flex items-center justify-between">
                                      <span>{group}</span>
                                      <Badge variant="secondary">
                                        {instrumentsByGroup[group]?.length || 0} instruments
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <div className="text-xs text-muted-foreground">
                                      Drag to add to workflow
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>

                          {nodes.length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <Label>Workflow Nodes</Label>
                                <div className="space-y-2">
                                  {nodes.map(node => {
                                    const isGroupExpanded = expandedGroups.has(node.data.instrument.group);
                                    
                                    return (
                                      <Card
                                        key={node.id}
                                        className={cn(
                                          "transition-all",
                                          selectedNode?.id === node.id && "ring-2 ring-primary"
                                        )}
                                      >
                                        <CardHeader className="p-3">
                                          <div
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() => toggleGroup(node.data.instrument.group)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <BeakerIcon className="h-4 w-4" />
                                              <span className="font-medium">{node.data.instrument.group}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                              {isGroupExpanded ? (
                                                <ChevronDownIcon className="h-4 w-4" />
                                              ) : (
                                                <ChevronRightIcon className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </div>
                                        </CardHeader>

                                        {isGroupExpanded && (
                                          <CardContent className="p-3 pt-0">
                                            <div className="space-y-4">
                                              {/* Tasks Section */}
                                              <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <Label className="text-sm">Tasks</Label>
                                                  <Dialog>
                                                    <DialogTrigger asChild>
                                                      <Button variant="outline" size="sm">
                                                        <PlusIcon className="h-3 w-3 mr-1" />
                                                        Add Task
                                                      </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                      <DialogHeader>
                                                        <DialogTitle>Add Task</DialogTitle>
                                                      </DialogHeader>
                                                      <div className="space-y-2">
                                                        {node.data.instrument.driver.tasks?.map((task: any) => (
                                                          <div
                                                            key={task.name}
                                                            className="p-2 border rounded-lg hover:bg-accent cursor-pointer"
                                                            onClick={() => {
                                                              node.data.onTaskSelect(task.name);
                                                              setExpandedTasks(new Set([...expandedTasks, task.name]));
                                                            }}
                                                          >
                                                            <div className="font-medium">{task.name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                              {task.description}
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </DialogContent>
                                                  </Dialog>
                                                </div>

                                                {node.data.selectedTasks.map((taskName: string) => {
                                                  const task = node.data.instrument.driver.tasks?.find(
                                                    (t: any) => t.name === taskName
                                                  );
                                                  const isTaskExpanded = expandedTasks.has(taskName);
                                                  const taskLabware = node.data.selectedLabware[taskName] || [];

                                                  return (
                                                    <Card key={taskName} className="border-dashed">
                                                      <CardHeader className="p-2">
                                                        <div
                                                          className="flex items-center justify-between cursor-pointer"
                                                          onClick={() => toggleTask(taskName)}
                                                        >
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">
                                                              {taskName}
                                                            </span>
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                            <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-6 w-6"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                node.data.onTaskRemove(taskName);
                                                              }}
                                                            >
                                                              <XIcon className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-6 w-6"
                                                            >
                                                              {isTaskExpanded ? (
                                                                <ChevronDownIcon className="h-3 w-3" />
                                                              ) : (
                                                                <ChevronRightIcon className="h-3 w-3" />
                                                              )}
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      </CardHeader>

                                                      {isTaskExpanded && (
                                                        <CardContent className="p-2 pt-0">
                                                          <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                              <Label className="text-xs">Labware</Label>
                                                              <Dialog>
                                                                <DialogTrigger asChild>
                                                                  <Button variant="outline" size="sm">
                                                                    <PlusIcon className="h-3 w-3 mr-1" />
                                                                    Add
                                                                  </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                  <DialogHeader>
                                                                    <DialogTitle>Add Labware</DialogTitle>
                                                                  </DialogHeader>
                                                                  <div className="space-y-2">
                                                                    {labwareOptions.map(labware => (
                                                                      <div
                                                                        key={labware.id}
                                                                        className="p-2 border rounded-lg hover:bg-accent cursor-pointer"
                                                                        onClick={() => {
                                                                          node.data.onLabwareSelect(taskName, labware.id);
                                                                        }}
                                                                      >
                                                                        <div className="font-medium">
                                                                          {labware.name}
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground">
                                                                          {labware.description}
                                                                        </div>
                                                                      </div>
                                                                    ))}
                                                                  </div>
                                                                </DialogContent>
                                                              </Dialog>
                                                            </div>

                                                            {taskLabware.map((labwareId: string) => {
                                                              const labware = labwareOptions.find(
                                                                l => l.id === labwareId
                                                              );
                                                              const config = node.data.labwareConfig?.[taskName]?.[labwareId];

                                                              return (
                                                                <div
                                                                  key={labwareId}
                                                                  className="p-2 border rounded-lg space-y-2"
                                                                >
                                                                  <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-medium">
                                                                      {labware?.name}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                      <Dialog>
                                                                        <DialogTrigger asChild>
                                                                          <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                          >
                                                                            <Settings2Icon className="h-3 w-3" />
                                                                          </Button>
                                                                        </DialogTrigger>
                                                                        <DialogContent>
                                                                          <DialogHeader>
                                                                            <DialogTitle>
                                                                              Configure {labware?.name}
                                                                            </DialogTitle>
                                                                          </DialogHeader>
                                                                          <div className="space-y-4">
                                                                            <div className="space-y-2">
                                                                              <Label>Slot</Label>
                                                                              <Input
                                                                                type="number"
                                                                                min={1}
                                                                                value={config?.slot || 1}
                                                                                onChange={(e) => {
                                                                                  node.data.onLabwareConfigUpdate(
                                                                                    taskName,
                                                                                    labwareId,
                                                                                    {
                                                                                      ...config,
                                                                                      slot: parseInt(e.target.value)
                                                                                    }
                                                                                  );
                                                                                }}
                                                                              />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                              <Label>Temperature (°C)</Label>
                                                                              <Input
                                                                                type="number"
                                                                                value={config?.temperature || 25}
                                                                                onChange={(e) => {
                                                                                  node.data.onLabwareConfigUpdate(
                                                                                    taskName,
                                                                                    labwareId,
                                                                                    {
                                                                                      ...config,
                                                                                      temperature: parseInt(e.target.value)
                                                                                    }
                                                                                  );
                                                                                }}
                                                                              />
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                              <Label>Sealed</Label>
                                                                              <Switch
                                                                                checked={config?.isSealed || false}
                                                                                onCheckedChange={(checked) => {
                                                                                  node.data.onLabwareConfigUpdate(
                                                                                    taskName,
                                                                                    labwareId,
                                                                                    {
                                                                                      ...config,
                                                                                      isSealed: checked
                                                                                    }
                                                                                  );
                                                                                }}
                                                                              />
                                                                            </div>
                                                                          </div>
                                                                        </DialogContent>
                                                                      </Dialog>
                                                                      <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => {
                                                                          node.data.onLabwareRemove(
                                                                            taskName,
                                                                            labwareId
                                                                          );
                                                                        }}
                                                                      >
                                                                        <XIcon className="h-3 w-3" />
                                                                      </Button>
                                                                    </div>
                                                                  </div>

                                                                  {config && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                      <Badge
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                      >
                                                                        <ThermometerIcon className="h-3 w-3 mr-1" />
                                                                        {config.temperature}°C
                                                                      </Badge>
                                                                      {config.isSealed && (
                                                                        <Badge
                                                                          variant="outline"
                                                                          className="text-xs"
                                                                        >
                                                                          <ShieldIcon className="h-3 w-3 mr-1" />
                                                                          Sealed
                                                                        </Badge>
                                                                      )}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        </CardContent>
                                                      )}
                                                    </Card>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </CardContent>
                                        )}
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </>
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
            <div 
              className="h-full w-full"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
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
                  <Button variant="outline"size="icon" onClick={handleZoomIn}>
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setShowLeftPanel(!showLeftPanel)}>
                    {showLeftPanel ? <PanelLeftIcon className="h-4 w-4" /> : <PanelRightIcon className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setShowRightPanel(!showRightPanel)}>
                    <FileJsonIcon className="h-4 w-4" />
                  </Button>
                </Panel>
              </ReactFlow>
            </div>
          </ResizablePanel>

          {showRightPanel && (
            <>
              <ResizableHandle withHandle>
                <GripVerticalIcon className="h-4 w-4" />
              </ResizableHandle>
              <ResizablePanel defaultSize={25}>
                <div className="h-full border-l">
                  <div className="p-4 border-b bg-card">
                    <h2 className="text-lg font-semibold">Workflow JSON</h2>
                    <p className="text-sm text-muted-foreground">Current workflow configuration</p>
                  </div>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <pre className="p-4 text-xs">
                      {JSON.stringify(getWorkflowJson(), null, 2)}
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