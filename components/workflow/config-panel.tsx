'use client';

import { Node } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BeakerIcon, TagIcon, PlusIcon, XIcon, GripIcon, ThermometerIcon, ShieldIcon } from 'lucide-react';
import { labwareOptions } from '@/lib/types/labware';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ConfigPanelProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, updates: any) => void;
}

export default function ConfigPanel({ selectedNode, onNodeUpdate }: ConfigPanelProps) {
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

  const handleDragStart = (e: React.DragEvent, task: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(task));
    e.dataTransfer.effectAllowed = 'move';
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2 py-1">
            {instrument.group}
          </Badge>
          <h2 className="text-lg font-semibold">Node Configuration</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <Tabs defaultValue="tasks">
            <TabsList className="w-full">
              <TabsTrigger value="tasks" className="flex-1">
                <BeakerIcon className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="labware" className="flex-1">
                <TagIcon className="h-4 w-4 mr-2" />
                Labware
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Available Tasks</h3>
                  <div className="space-y-2">
                    {availableTasks.map(task => (
                      <Card 
                        key={task.name} 
                        className={cn(
                          "relative cursor-move transition-colors",
                          "hover:border-primary/50",
                          selectedTasks.includes(task.name) && "bg-muted"
                        )}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                      >
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripIcon className="h-4 w-4 text-muted-foreground" />
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
                                <Badge key={param} variant="secondary" className="text-xs">
                                  {param}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {selectedTasks.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Selected Tasks</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTasks.map(taskName => (
                          <Badge key={taskName} variant="secondary" className="flex items-center gap-1">
                            {taskName}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 hover:text-destructive"
                              onClick={() => handleRemoveTask(taskName)}
                            >
                              <XIcon className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="labware" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Available Labware</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {labwareOptions.map(labware => (
                      <Card 
                        key={labware.id}
                        className="hover:border-primary/50 transition-colors"
                      >
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm">{labware.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">{labware.description}</p>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <PlusIcon className="h-4 w-4 mr-2" />
                                  Add to Task
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add {labware.name} to Task</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Select Task</Label>
                                    <Select
                                      onValueChange={(taskName) => handleAddLabware(taskName, labware.id)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose a task" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {selectedTasks.map(taskName => (
                                          <SelectItem 
                                            key={taskName} 
                                            value={taskName}
                                            disabled={selectedLabware[taskName]?.includes(labware.id)}
                                          >
                                            {taskName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {labware.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {labware.slots} slots
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {selectedTasks.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Task Labware</h3>
                      {selectedTasks.map(taskName => (
                        <Card key={taskName}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">{taskName}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {(selectedLabware[taskName] || []).map(labwareId => {
                              const labware = labwareOptions.find(l => l.id === labwareId);
                              const config = labwareConfig[taskName]?.[labwareId] || {
                                slot: 1,
                                temperature: 25,
                                isSealed: false
                              };

                              return (
                                <div key={labwareId} className="p-3 border rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-sm">{labware?.name}</div>
                                      <div className="text-xs text-muted-foreground">{labware?.description}</div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveLabware(taskName, labwareId)}
                                      className="text-destructive"
                                    >
                                      <XIcon className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-xs">Slot</Label>
                                        <Input
                                          type="number"
                                          min={1}
                                          value={config.slot}
                                          onChange={(e) => handleLabwareConfigChange(
                                            taskName,
                                            labwareId,
                                            { slot: parseInt(e.target.value) }
                                          )}
                                          className="h-8"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Temperature (°C)</Label>
                                        <Input
                                          type="number"
                                          value={config.temperature}
                                          onChange={(e) => handleLabwareConfigChange(
                                            taskName,
                                            labwareId,
                                            { temperature: parseInt(e.target.value) }
                                          )}
                                          className="h-8"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <Label className="text-xs">Sealed</Label>
                                      <Switch
                                        checked={config.isSealed}
                                        onCheckedChange={(checked) => handleLabwareConfigChange(
                                          taskName,
                                          labwareId,
                                          { isSealed: checked }
                                        )}
                                      />
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className="text-xs">
                                        <ThermometerIcon className="h-3 w-3 mr-1" />
                                        {config.temperature}°C
                                      </Badge>
                                      {config.isSealed && (
                                        <Badge variant="outline" className="text-xs">
                                          <ShieldIcon className="h-3 w-3 mr-1" />
                                          Sealed
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {!selectedLabware[taskName]?.length && (
                              <div className="text-sm text-muted-foreground text-center py-2">
                                No labware assigned to this task
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}