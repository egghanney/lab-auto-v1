'use client';

import { Handle, NodeProps, Position } from 'reactflow';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { BeakerIcon, TrashIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface TaskNodeProps extends NodeProps {
  data: {
    label: string;
    instrument: any;
    selectedTasks: string[];
    selectedLabware: Record<string, string[]>;
    labwareConfig?: Record<string, Record<string, any>>;
    onDelete: () => void;
  };
}

export default function TaskNode({ data, isConnectable, selected }: TaskNodeProps) {
  const { instrument, selectedTasks = [], selectedLabware = {}, onDelete } = data;
  
  return (
    <div className={cn(
      'px-4 py-3 rounded-xl border-2 shadow-lg backdrop-blur-sm min-w-[280px] transition-all duration-200 group relative',
      'bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200 hover:border-primary-300',
      'dark:from-primary-950 dark:to-primary-900/50 dark:border-primary-800 dark:hover:border-primary-700',
      selected && 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background'
    )}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-6 h-6 flex items-center justify-center">
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className={cn(
            "w-4 h-4 rounded-full border-2 border-primary",
            "bg-background dark:bg-background",
            "transition-all duration-200",
            "hover:scale-125 hover:border-primary/80",
            "before:content-[''] before:absolute before:inset-0 before:rounded-full",
            "before:animate-ping before:bg-primary/20",
            "after:content-[''] after:absolute after:inset-[2px] after:rounded-full",
            "after:bg-primary/20 after:transition-all after:duration-200",
            "group-hover:after:bg-primary/40"
          )}
        />
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <Badge 
          variant="secondary" 
          className="flex items-center gap-1 font-medium"
        >
          <BeakerIcon className="h-4 w-4" />
          {instrument.group}
        </Badge>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {instrument.instruments.length} instruments
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={onDelete}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="font-medium text-sm mb-3">{data.label}</div>

      <div className="space-y-2">
        {selectedTasks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTasks.map(taskName => (
              <Badge key={taskName} variant="outline">
                {taskName}
                {selectedLabware[taskName]?.length > 0 && (
                  <span className="ml-1 text-xs">
                    ({selectedLabware[taskName].length})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3 w-6 h-6 flex items-center justify-center">
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className={cn(
            "w-4 h-4 rounded-full border-2 border-primary",
            "bg-background dark:bg-background",
            "transition-all duration-200",
            "hover:scale-125 hover:border-primary/80",
            "before:content-[''] before:absolute before:inset-0 before:rounded-full",
            "before:animate-ping before:bg-primary/20",
            "after:content-[''] after:absolute after:inset-[2px] after:rounded-full",
            "after:bg-primary/20 after:transition-all after:duration-200",
            "group-hover:after:bg-primary/40"
          )}
        />
      </div>
    </div>
  );
}