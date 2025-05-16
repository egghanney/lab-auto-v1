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
import { BeakerIcon, TagIcon, PlusIcon, XIcon, CheckIcon } from 'lucide-react';
import { labwareOptions } from '@/lib/types/labware';

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

  const handleTaskDurationChange = (taskName: string, duration: number) => {
    onNodeUpdate(selectedNode.id, {
      ...data,
      taskDurations: {
        ...data.taskDurations,
        [taskName]: duration
      }
    });
  };

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
                      <Card key={task.name} className="relative">
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{task.name}</CardTitle>
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
                        {selectedTasks.includes(task.name) && (
                          <>
                            <Separator className="my-2" />
                            <CardContent className="py-2">
                              <div className="space-y-2">
                                <Label>Duration (seconds)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={data.taskDurations?.[task.name] || 5}
                                  onChange={(e) => handleTaskDurationChange(task.name, parseInt(e.target.value))}
                                />
                              </div>
                            </CardContent>
                          </>
                        )}
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
              {selectedTasks.map(taskName => {
                const taskLabware = selectedLabware[taskName] || [];
                return (
                  <Card key={taskName}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{taskName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {taskLabware.map(labwareId => {
                        const labware = labwareOptions.find(l => l.id === labwareId);
                        const config = labwareConfig[taskName]?.[labwareId] || {};
                        
                        return (
                          <div key={labwareId} className="space-y-4 p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{labware?.name}</h4>
                              <Badge variant="outline">{labware?.type}</Badge>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Slot</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={config.slot || 1}
                                    onChange={(e) => handleLabwareConfigChange(
                                      taskName,
                                      labwareId,
                                      { slot: parseInt(e.target.value) }
                                    )}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Temperature (°C)</Label>
                                  <Input
                                    type="number"
                                    value={config.temperature || 25}
                                    onChange={(e) => handleLabwareConfigChange(
                                      taskName,
                                      labwareId,
                                      { temperature: parseInt(e.target.value) }
                                    )}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Label>Sealed</Label>
                                <Switch
                                  checked={config.isSealed || false}
                                  onCheckedChange={(checked) => handleLabwareConfigChange(
                                    taskName,
                                    labwareId,
                                    { isSealed: checked }
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}