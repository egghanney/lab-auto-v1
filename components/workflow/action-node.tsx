'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getDriversByGroup } from '@/lib/types/instrument';
import { useState } from 'react';
import { SettingsIcon, XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { labwareOptions } from '@/lib/types/labware';

interface ActionNodeProps {
  data: {
    group: string;
    action: string;
    parameters: Record<string, any>;
    labware: Record<string, {
      id: string;
      name: string;
      initial_slot: number;
      final_slot: number;
      quantity: number;
    }>;
    onUpdate: (data: any) => void;
  };
}

export function ActionNode({ data }: ActionNodeProps) {
  const [showConfig, setShowConfig] = useState(false);
  const drivers = getDriversByGroup(data.group);
  const selectedDriver = drivers[0]; // For demo, use first driver
  const availableActions = selectedDriver?.tasks || [];

  return (
    <Card className="p-4 min-w-[200px]">
      <div className="flex items-center justify-between mb-4">
        <Badge>{data.group}</Badge>
        <Button variant="ghost" size="icon" onClick={() => setShowConfig(true)}>
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Action</Label>
          <Select value={data.action} onValueChange={(value) => data.onUpdate({ ...data, action: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {availableActions.map(action => (
                <SelectItem key={action.name} value={action.name}>
                  {action.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {Object.entries(data.labware).map(([id, labware]) => (
          <div key={id} className="p-2 bg-muted rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{labware.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                const { [id]: removed, ...rest } = data.labware;
                data.onUpdate({ ...data, labware: rest });
              }}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Action</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Add Labware</Label>
              <Select onValueChange={(value) => {
                const labware = labwareOptions.find(l => l.id === value);
                if (labware) {
                  data.onUpdate({
                    ...data,
                    labware: {
                      ...data.labware,
                      [labware.id]: {
                        id: labware.id,
                        name: labware.name,
                        initial_slot: 1,
                        final_slot: 1,
                        quantity: 1
                      }
                    }
                  });
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select labware" />
                </SelectTrigger>
                <SelectContent>
                  {labwareOptions.map(labware => (
                    <SelectItem key={labware.id} value={labware.id}>
                      {labware.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableActions.find(a => a.name === data.action)?.parameters.map(param => (
              <div key={param}>
                <Label>{param}</Label>
                <Input
                  value={data.parameters[param] || ''}
                  onChange={(e) => data.onUpdate({
                    ...data,
                    parameters: {
                      ...data.parameters,
                      [param]: e.target.value
                    }
                  })}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}