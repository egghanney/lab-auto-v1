'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { labwareOptions } from '@/lib/types/labware';
import { Node } from 'reactflow';

interface TaskConfigPanelProps {
  selectedNode: Node | null;
  onTaskSelect: (nodeId: string, taskName: string) => void;
  onTaskRemove: (nodeId: string, taskName: string) => void;
  onLabwareSelect: (nodeId: string, taskName: string, labwareId: string) => void;
  onLabwareRemove: (nodeId: string, taskName: string, labwareId: string) => void;
  onLabwareConfigUpdate: (nodeId: string, taskName: string, labwareId: string, config: any) => void;
}

export default function TaskConfigPanel({
  selectedNode,
  onTaskSelect,
  onTaskRemove,
  onLabwareSelect,
  onLabwareRemove,
  onLabwareConfigUpdate,
}: TaskConfigPanelProps) {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  if (!selectedNode) {
    return (
      <Card className="m-4">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Select a node to configure tasks and labware
        </CardContent>
      </Card>
    );
  }

  const { instrument, selectedTasks = [], selectedLabware = {}, labwareConfig = {} } = selectedNode.data;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Node Configuration</h3>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{instrument.group}</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-sm text-muted-foreground">
              {instrument.instruments.length} instruments available
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Tasks</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {instrument.driver.tasks?.map((task: any) => (
                <DropdownMenuItem
                  key={task.name}
                  onClick={() => onTaskSelect(selectedNode.id, task.name)}
                  disabled={selectedTasks.includes(task.name)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{task.name}</span>
                    <span className="text-xs text-muted-foreground">{task.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {selectedTasks.map(taskName => {
            const task = instrument.driver.tasks?.find((t: any) => t.name === taskName);
            const taskLabware = selectedLabware[taskName] || [];
            
            return (
              <Card key={taskName} className="mb-4">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{taskName}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onTaskRemove(selectedNode.id, taskName)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {task?.parameters && task.parameters.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.parameters.map((param: string) => (
                        <Badge key={param} variant="secondary" className="text-xs">
                          {param}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Labware</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Labware
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Labware</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2">
                              {labwareOptions.map(labware => (
                                <Card
                                  key={labware.id}
                                  className="cursor-pointer hover:bg-accent"
                                  onClick={() => onLabwareSelect(selectedNode.id, taskName, labware.id)}
                                >
                                  <CardContent className="p-3">
                                    <div className="font-medium">{labware.name}</div>
                                    <div className="text-sm text-muted-foreground">{labware.description}</div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {taskLabware.map(labwareId => {
                      const labware = labwareOptions.find(l => l.id === labwareId);
                      const config = labwareConfig?.[taskName]?.[labwareId] || {
                        slot: 1,
                        temperature: 25,
                        isSealed: false
                      };

                      return (
                        <Card key={labwareId} className="border-dashed">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{labware?.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onLabwareRemove(selectedNode.id, taskName, labwareId)}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Slot</Label>
                                  <Input
                                    type="number"
                                    value={config.slot}
                                    min={1}
                                    className="h-7"
                                    onChange={(e) => onLabwareConfigUpdate(
                                      selectedNode.id,
                                      taskName,
                                      labwareId,
                                      { ...config, slot: parseInt(e.target.value) }
                                    )}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Temperature (°C)</Label>
                                  <Input
                                    type="number"
                                    value={config.temperature}
                                    className="h-7"
                                    onChange={(e) => onLabwareConfigUpdate(
                                      selectedNode.id,
                                      taskName,
                                      labwareId,
                                      { ...config, temperature: parseInt(e.target.value) }
                                    )}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Sealed</Label>
                                <Switch
                                  checked={config.isSealed}
                                  onCheckedChange={(checked) => onLabwareConfigUpdate(
                                    selectedNode.id,
                                    taskName,
                                    labwareId,
                                    { ...config, isSealed: checked }
                                  )}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </ScrollArea>
      </div>
    </div>
  );
}