import { useEffect, useState } from 'react';
import { Node } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { BeakerIcon, TagIcon, PlusIcon, XIcon, GripIcon, MoveIcon, ArrowLeftIcon, Settings2Icon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { labwareOptions } from '@/lib/types/labware';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConfigPanelProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  onBackToInstruments?: () => void;
}

export default function ConfigPanel({ selectedNode, onNodeUpdate, onBackToInstruments }: ConfigPanelProps) {
  const [openTasks, setOpenTasks] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  if (!selectedNode) {
    return (
      <div className="p-4">
        <div className="text-center text-muted-foreground">
          Select a node to configure its settings
        </div>
      </div>
    );
  }

  const { data } = selectedNode;
  const { instrument, selectedTasks = [], selectedLabware = {}, labwareConfig = {} } = data;
  const availableTasks = instrument.driver.tasks || [];

  const handleLabwareConfigChange = (taskName: string, labwareId: string, updates: any) => {
    const currentConfig = labwareConfig[taskName]?.[labwareId] || {};
    onNodeUpdate(selectedNode.id, {
      ...data,
      labwareConfig: {
        ...labwareConfig,
        [taskName]: {
          ...(labwareConfig[taskName] || {}),
          [labwareId]: {
            ...currentConfig,
            ...updates
          }
        }
      }
    });
  };

  const handleAddTask = (taskName: string) => {
    if (data.onTaskSelect) {
      data.onTaskSelect(taskName);
    }
  };

  const handleRemoveTask = (taskName: string) => {
    if (data.onTaskRemove) {
      data.onTaskRemove(taskName);
    }
  };

  const handleAddLabware = (taskName: string, labwareId: string) => {
    if (data.onLabwareSelect) {
      data.onLabwareSelect(taskName, labwareId);
    }
  };

  const handleRemoveLabware = (taskName: string, labwareId: string) => {
    if (data.onLabwareRemove) {
      data.onLabwareRemove(taskName, labwareId);
    }
  };

  const toggleTask = (taskName: string) => {
    setOpenTasks(prev => ({
      ...prev,
      [taskName]: !prev[taskName]
    }));
  };

  const onDragStart = (event: React.DragEvent, data: any, type: 'task' | 'labware') => {
    event.dataTransfer.setData(type === 'task' ? 'application/json' : 'labware', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'copy';
    setDraggedItem(type === 'task' ? data.name : data.id);
  };

  const onDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2 py-1">
            {instrument.group}
          </Badge>
          <h2 className="text-sm font-medium">Configure</h2>
        </div>
        {onBackToInstruments && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBackToInstruments}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="tasks" className="flex-1">
            <BeakerIcon className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="labware" className="flex-1">
            <TagIcon className="h-4 w-4 mr-2" />
            Labware
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <TabsContent value="tasks" className="p-4 space-y-4">
              <div className="space-y-2">
                {availableTasks.map(task => (
                  <Card
                    key={task.name}
                    draggable
                    onDragStart={(e) => onDragStart(e, task, 'task')}
                    onDragEnd={onDragEnd}
                    className={cn(
                      "relative transition-all duration-200 cursor-move group",
                      selectedTasks.includes(task.name) && "bg-muted",
                      draggedItem === task.name && "opacity-50"
                    )}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary transition-transform group-hover:scale-110">
                            <MoveIcon className="h-5 w-5 group-hover:animate-pulse" />
                          </div>
                          <CardTitle className="text-sm">{task.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectedTasks.includes(task.name) 
                            ? handleRemoveTask(task.name)
                            : handleAddTask(task.name)
                          }
                          className={selectedTasks.includes(task.name) ? 'text-destructive' : ''}
                        >
                          {selectedTasks.includes(task.name) ? (
                            <XIcon className="h-4 w-4" />
                          ) : (
                            <PlusIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      {task.parameters.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.parameters.map(param => (
                            <Badge 
                              key={param} 
                              variant="secondary" 
                              className="text-xs transition-colors hover:bg-primary/20"
                            >
                              {param}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-lg" />
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="labware" className="p-4 space-y-4">
              {selectedTasks.map(taskName => {
                const task = availableTasks.find(t => t.name === taskName);
                const taskLabware = selectedLabware[taskName] || [];
                const isOpen = openTasks[taskName];

                return (
                  <Collapsible
                    key={taskName}
                    open={isOpen}
                    onOpenChange={() => toggleTask(taskName)}
                  >
                    <Card>
                      <CardHeader className="py-3">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDownIcon className="h-4 w-4" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4" />
                              )}
                              <CardTitle className="text-sm">{taskName}</CardTitle>
                              <Badge variant="secondary">
                                {taskLabware.length}
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              {labwareOptions.map(labware => (
                                <div
                                  key={labware.id}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, { id: labware.id, taskName }, 'labware')}
                                  onDragEnd={onDragEnd}
                                  className={cn(
                                    "relative flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-move group",
                                    taskLabware.includes(labware.id) && "border-primary",
                                    "hover:shadow-md hover:border-primary/50",
                                    draggedItem === labware.id && "opacity-50"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary transition-transform group-hover:scale-110">
                                      <MoveIcon className="h-5 w-5 group-hover:animate-pulse" />
                                    </div>
                                    <div>
                                      <div className="font-medium">{labware.name}</div>
                                      <div className="text-xs text-muted-foreground">{labware.description}</div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (taskLabware.includes(labware.id)) {
                                        handleRemoveLabware(taskName, labware.id);
                                      } else {
                                        handleAddLabware(taskName, labware.id);
                                      }
                                    }}
                                  >
                                    {taskLabware.includes(labware.id) ? (
                                      <XIcon className="h-4 w-4" />
                                    ) : (
                                      <PlusIcon className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-lg" />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {taskLabware.length > 0 && (
                              <>
                                <Separator />
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">
                                    Configured Labware
                                  </h4>
                                  <div className="space-y-2 pb-4">
                                    {taskLabware.map(labwareId => {
                                      const labware = labwareOptions.find(l => l.id === labwareId);
                                      const config = labwareConfig[taskName]?.[labwareId] || {
                                        slot: 1,
                                        instrumentId: ''
                                      };

                                      return (
                                        <div key={labwareId} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <div>
                                              <p className="text-sm font-medium">{labware?.name}</p>
                                              <div className="flex gap-1 mt-1">
                                                {config.instrumentId && (
                                                  <Badge variant="outline" className="text-xs">
                                                    <BeakerIcon className="h-3 w-3 mr-1" />
                                                    {instrument.instruments[config.instrumentId]?.driver.name}
                                                  </Badge>
                                                )}
                                                <Badge variant="outline" className="text-xs">
                                                  <MoveIcon className="h-3 w-3 mr-1" />
                                                  Slot {config.slot}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                  <Settings2Icon className="h-3 w-3" />
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent>
                                                <DialogHeader>
                                                  <DialogTitle>Configure {labware?.name}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                  <div className="space-y-2">
                                                    <Label>Instrument</Label>
                                                    <Select
                                                      value={config.instrumentId}
                                                      onValueChange={(value) => handleLabwareConfigChange(
                                                        taskName,
                                                        labwareId,
                                                        { instrumentId: value }
                                                      )}
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue placeholder="Select instrument" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {Object.entries(instrument.instruments).map(([id, inst]: [string, any]) => (
                                                          <SelectItem key={id} value={id}>
                                                            {inst.driver.name}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                  <div className="space-y-2">
                                                    <Label>Slot</Label>
                                                    <Input
                                                      type="number"
                                                      value={config.slot}
                                                      onChange={(e) => handleLabwareConfigChange(
                                                        taskName,
                                                        labwareId,
                                                        { slot: parseInt(e.target.value) }
                                                      )}
                                                      min={1}
                                                    />
                                                  </div>
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleRemoveLabware(taskName, labwareId)}
                                              className="h-6 w-6 text-destructive"
                                            >
                                              <XIcon className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}