'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicForm } from '@/components/workflows/DynamicForm';
import { StatusBadge } from '@/components/workflows/StatusBadge';
import { useTask, useTaskFormVariables } from '@/hooks/useTasks';
import { formDataToVariables, useWorkflowApi } from '@/lib/api/workflows';
import type { FormField } from '@/types/workflow';

export default function CompleteTaskPage({
  params,
}: {
  params: { locale: string; taskId: string };
}) {
  const router = useRouter();
  const api = useWorkflowApi();
  const queryClient = useQueryClient();

  const { data: task, isLoading: taskLoading } = useTask(params.taskId);
  const { data: formVariables, isLoading: variablesLoading } = useTaskFormVariables(params.taskId);

  const completeTaskMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      const variables = formDataToVariables(formData);
      return api.completeTask(params.taskId, { variables });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['process-instances'] });
      router.push(`/${params.locale}/workflows/tasks`);
    },
  });

  if (taskLoading || variablesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive">
          Task Not Found
        </h3>
        <p className="mt-2 text-sm text-destructive">
          The requested task could not be found or has already been completed.
        </p>
      </div>
    );
  }

  const getStatus = (): 'active' | 'suspended' | 'pending' => {
    if (task.suspended) {
      return 'suspended';
    }
    if (task.assignee) {
      return 'active';
    }
    return 'pending';
  };

  const fields: FormField[] = formVariables
    ? Object.entries(formVariables).map(([key, variable]) => ({
      id: key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      type: variable.type.toLowerCase() as any,
      defaultValue: variable.value,
    }))
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          Back to Tasks
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{task.name}</h1>
          <StatusBadge status={getStatus()} />
        </div>
        {task.description && (
          <p className="mt-2 text-muted-foreground">{task.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>
            Complete this task by filling out the form below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
            <div>
              <p className="text-sm font-medium">Task ID</p>
              <p className="text-sm text-muted-foreground">{task.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Priority</p>
              <p className="text-sm text-muted-foreground">{task.priority}</p>
            </div>
            {task.assignee && (
              <div>
                <p className="text-sm font-medium">Assignee</p>
                <p className="text-sm text-muted-foreground">{task.assignee}</p>
              </div>
            )}
            {task.due && (
              <div>
                <p className="text-sm font-medium">Due Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.due).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">
                {new Date(task.created).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Process Instance</p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() =>
                  router.push(
                    `/${params.locale}/workflows/instances/${task.processInstanceId}`,
                  )}
              >
                View Instance
              </Button>
            </div>
          </div>

          {task.suspended
            ? (
                <div className="rounded-md border border-yellow-500 bg-yellow-500/10 p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    This task is currently suspended and cannot be completed.
                  </p>
                </div>
              )
            : (
                <>
                  {fields.length > 0
                    ? (
                        <DynamicForm
                          fields={fields}
                          initialValues={formVariables}
                          onSubmit={(formData) => {
                            completeTaskMutation.mutate(formData);
                          }}
                          submitLabel="Complete Task"
                          isLoading={completeTaskMutation.isPending}
                        />
                      )
                    : (
                        <div className="flex justify-end">
                          <Button
                            onClick={() => completeTaskMutation.mutate({})}
                            disabled={completeTaskMutation.isPending}
                          >
                            {completeTaskMutation.isPending
                              ? 'Completing...'
                              : 'Complete Task'}
                          </Button>
                        </div>
                      )}
                </>
              )}

          {completeTaskMutation.isError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                {completeTaskMutation.error instanceof Error
                  ? completeTaskMutation.error.message
                  : 'Failed to complete task'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
