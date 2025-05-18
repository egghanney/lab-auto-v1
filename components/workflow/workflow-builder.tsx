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
import ConfigPanel from './config-panel';
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
  GripHorizontalIcon,
  MoveIcon,
  BeakerIcon
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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedWorkcellId, setSelectedWorkcellId] = useState<string>('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isTaskListOpen, setIsTaskListOpen] = useState(true);
  const [openTaskLabware, setOpenTaskLabware] = useState<string | null>(null);
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
    
    const element = event.currentTarget as HTMLElement;
    element.style.opacity = '0.5';
    element.style.transform = 'scale(1.02)';
    
    const onDragEnd = () => {
      element.style.opacity = '';
      element.style.transform = '';
      element.removeEventListener('dragend', onDragEnd);
    };
    element.addEventListener('dragend', onDragEnd);
  };

  const addGroupToCanvas = (group: string, position?: { x: number; y: number }) => {
    if (!selectedWorkcell) return;

    const instruments = instrumentsByGroup[group];
    if (!instruments?.length) return;

    const nodeId = `${group}-${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
      type: 'task',
      position: position || {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
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
        taskDurations: {},
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
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const group = event.dataTransfer.getData('application/instrumentGroup');
      if (!group || !selectedWorkcell) return;

      const { clientX, clientY } = event;
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: clientX - reactFlowBounds.left,
        y: clientY - reactFlowBounds.top,
      };

      addGroupToCanvas(group, position);
    },
    [selectedWorkcell, instrumentsByGroup, setNodes]
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
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes(nodes => nodes.filter(node => node.id !== nodeId));
    setEdges(edges => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  const handleNodeUpdate = useCallback((nodeId: string, updates: any) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...updates
          }
        };
      }
      return node;
    }));
  }, [setNodes]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(z => Math.min(z + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(z => Math.max(z - 0.2, 0.2));
  }, []);

  const isWorkcellSelectionDisabled = nodes.length > 0;

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
      const { selectedTasks, selectedLabware, labwareConfig, taskDurations } = node.data;
      selectedTasks.forEach((taskName: string) => {
        const taskId = `${node.id}-${taskName}`;
        workflow.tasks[taskId] = {
          id: taskId,
          instrument_type: node.data.instrument.group,
          duration: taskDurations?.[taskName] || 5,
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

  useEffect(() => {
    if (showRightPanel) {
      const workflow = getWorkflowJson();
      console.log('Current Workflow:', workflow);
    }
  }, [showRightPanel, nodes, getWorkflowJson]);

  return (
    <ReactFlowProvider>
      <div className="h-[calc(100vh-8rem)] border rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
        <ResizablePanelGroup direction="horizontal">
          {showLeftPanel && (
            <>
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="h-full border-r flex flex-col">
                  {selectedNode ? (
                    <ConfigPanel
                      selectedNode={selectedNode}
                      onNodeUpdate={handleNodeUpdate}
                      onBackToInstruments={() => setSelectedNode(null)}
                    />
                  ) : (
                    <>
                      <div className="p-4 border-b bg-card">
                        <h2 className="text-lg font-semibold">Workflow Builder</h2>
                        <p className="text-sm text-muted-foreground">Design your automation workflow</p>
                      </div>

                      <ScrollArea className="flex-1">
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
                          </div>

                          {selectedWorkcell && (
                            <div className="space-y-4">
                              <Separator />
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Instrument Groups</label>
                                <div className="space-y-2">
                                  {instrumentGroups.map(group => (
                                    <Card
                                      key={group}
                                      draggable
                                      onDragStart={(e) => onDragStart(e, group)}
                                      className="cursor-move hover:shadow-md transition-all group border-2 hover:border-primary"
                                    >
                                      <CardHeader className="p-3 space-y-0">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                                              <MoveIcon className="h-5 w-5 group-hover:animate-pulse" />
                                            </div>
                                            <div className="flex-1">
                                              <CardTitle className="text-sm flex items-center justify-between">
                                                <span>{group}</span>
                                                <Badge variant="secondary" className="group-hover:bg-primary/20">
                                                  <BeakerIcon className="h-3 w-3 mr-1" />
                                                  {instrumentsByGroup[group]?.length || 0}
                                                </Badge>
                                              </CardTitle>
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Drag to add to workflow
                                              </p>
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => addGroupToCanvas(group)}
                                          >
                                            <PlusIcon className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardHeader>
                                      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/20 rounded-lg" />
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </>
                  )}
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
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={edgeOptions}
                minZoom={0.2}
                maxZoom={2}
                defaultZoom={1}
                fitView
              >
                <Background 
                  variant="dots"
                  gap={24}
                  size={2}
                  color="hsl(var(--muted-foreground))"
                  className="opacity-5"
                />
                <Background 
                  variant="lines"
                  gap={96}
                  size={1}
                  color="hsl(var(--muted-foreground))"
                  className="opacity-[0.075]"
                  offset={1}
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