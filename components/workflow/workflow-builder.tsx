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
  const [selectedTask, setSelectedTask] = useState<Node | null>(null);
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
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const group = event.dataTransfer.getData('application/instrumentGroup');
      if (!group || !selectedWorkcell) return;

      const instruments = instrumentsByGroup[group];
      if (!instruments?.length) return;

      const { clientX, clientY } = event;
      const position = {
        x: clientX - 100,
        y: clientY - 100
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
          onDelete: () => onDeleteNode(nodeId)
        }
      };

      setNodes(nodes => [...nodes, newNode]);
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
        </ResizablePanelGroup>
      </div>
    </ReactFlowProvider>
  );
}