'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { WorkflowConfig, Workflow } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

// Dynamically import WorkflowBuilder to avoid SSR issues
const WorkflowBuilder = dynamic(
  () => import('@/components/workflow/workflow-builder'),
  { ssr: false }
);

const STORAGE_KEY = 'lab_workflows';

export default function NewWorkflowPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('Untitled Workflow');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    if (!workflowConfig || Object.keys(workflowConfig).length === 0) {
      toast({
        title: 'Error',
        description: 'Please connect and configure the workflow properly before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      const newWorkflow: Workflow = {
        id: crypto.randomUUID(),
        name: name.trim() || 'Untitled Workflow',
        config: workflowConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updated = [...existing, newWorkflow];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      toast({
        title: 'Success',
        description: 'Workflow saved successfully!',
      });

      router.push('/dashboard/workflows');
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/workflows">
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>
          </Button>

          {isEditing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="text-2xl font-bold h-auto py-1 px-2 w-auto min-w-[300px]"
              autoFocus
            />
          ) : (
            <h1
              className="text-3xl font-bold tracking-tight cursor-pointer hover:bg-accent hover:bg-opacity-50 rounded px-2 py-1"
              onClick={() => setIsEditing(true)}
            >
              {name}
            </h1>
          )}
        </div>

        <Button disabled={isSaving} onClick={handleSave}>
          <SaveIcon className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Workflow'}
        </Button>
      </div>

      <div className="space-y-2">
        <WorkflowBuilder
          onSave={(config: WorkflowConfig) => {
            console.log('Workflow config received:', config);
            setWorkflowConfig(config);
          }}
        />
      </div>
    </div>
  );
}