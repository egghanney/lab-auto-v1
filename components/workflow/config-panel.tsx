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
import { BeakerIcon, TagIcon, PlusIcon, XIcon, GripIcon, ThermometerIcon, ShieldIcon, Settings2Icon } from 'lucide-react';
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

      <Tabs defaultValue="tasks" className="flex-1">
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

        <ScrollArea className="flex-1">
          <TabsContent value="tasks" className="p-4 space-y-4">
            <div className="space-y-2">
              {availableTasks.map(task => (
                <Card
                  key={task.name}
                  className={cn(
                    "relative transition-colors",
                    selectedTasks.includes(task.name) && "bg-muted"
                  )}
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
          </TabsContent>

          <TabsContent value="labware" className="p-4 space-y-4">
            {selectedTasks.map(taskName => {
              const task = availableTasks.find(t => t.name === taskName);
              const taskLabware = selectedLabware[taskName] || [];

              return (
                <Card key={taskName}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{taskName}</CardTitle>
                      <Select
                        onValueChange={(labwareId) => handleAddLabware(taskName, labwareId)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Add labware" />
                        </SelectTrigger>
                        <SelectContent>
                          {labwareOptions.map(labware => (
                            <SelectItem 
                              key={labware.id} 
                              value={labware.id}
                              disabled={taskLabware.includes(labware.id)}
                            >
                              {labware.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      {taskLabware.map(labwareId => {
                        const labware = labwareOptions.find(l => l.id === labwareId);
                        const config = labwareConfig[taskName]?.[labwareId] || {
                          slot: 1,
                          temperature: 25,
                          isSealed: false
                        };

                        return (
                          <div key={labwareId} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-sm font-medium">{labware?.name}</p>
                                <div className="flex gap-1 mt-1">
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
                            <div className="flex items-center gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Settings2Icon className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Configure {labware?.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Slot</Label>
                                        <Input
                                          type="number"
                                          min={1}
                                          value={config.slot}
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
                                          value={config.temperature}
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
                                        checked={config.isSealed}
                                        onCheckedChange={(checked) => handleLabwareConfigChange(
                                          taskName,
                                          labwareId,
                                          { isSealed: checked }
                                        )}
                                      />
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveLabware(taskName, labwareId)}
                                className="h-8 w-8 text-destructive"
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}