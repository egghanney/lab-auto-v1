'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ActionNode } from './action-node';
import { FileJsonIcon, SaveIcon, PlayIcon } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { WorkflowConfig } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useWorkcells } from '@/lib/hooks/use-workcells';
import { Badge } from '../ui/badge';
import { getInstrumentGroups } from '@/lib/types/instrument';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface WorkflowBuilderProps {
  initialWorkflow?: WorkflowConfig;
  onSave?: (workflow: WorkflowConfig) => void;
}

const nodeTypes: NodeTypes = {
  action: ActionNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function WorkflowBuilder({ initialWorkflow, onSave }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedWorkcellId, setSelectedWorkcellId] = useState<string>('');
  const { toast } = useToast();
  const router = useRouter();
  const { workcells } = useWorkcells();

  const instrumentGroups = getInstrumentGroups();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = () => {
    if (!selectedWorkcellId) {
      toast({
        title: 'Error',
        description: 'Please select a workcell first',
        variant: 'destructive'
      });
      return;
    }

    if (nodes.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one action to the workflow',
        variant: 'destructive'
      });
      return;
    }

    // Generate workflow config from nodes and edges
    const config: WorkflowConfig = {
      actions: {},
      instrument_groups: {},
      labware: {},
      history: {},
      time_constraints: []
    };

    // Save workflow
    if (onSave) {
      onSave(config);
    }
  };

  const handleStartRun = () => {
    if (!selectedWorkcellId) {
      toast({
        title: 'Error',
        description: 'Please select a workcell first',
        variant: 'destructive'
      });
      return;
    }

    // Save and start run
    handleSave();
    router.push('/dashboard/runs/new');
  };

  return (
    <div className="h-[calc(100vh-8rem)] border rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={selectedWorkcellId} onValueChange={setSelectedWorkcellId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select workcell" />
              </SelectTrigger>
              <SelectContent>
                {workcells.map(workcell => (
                  <SelectItem key={workcell.id} value={workcell.id}>
                    {workcell.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedWorkcellId && (
              <div className="flex gap-2">
                {instrumentGroups.map(group => (
                  <Badge key={group} variant="outline">
                    {group}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave}>
              <SaveIcon className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleStartRun}>
              <PlayIcon className="h-4 w-4 mr-2" />
              Run
            </Button>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}