'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/workflows/StatusBadge';
import {
  useHistoricActivityInstances,
  useProcessInstance,
  useProcessInstanceVariables,
} from '@/hooks/useProcessInstance';
import { useTasks } from '@/hooks/useTasks';

export default function ProcessInstanceDetailsPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const router = useRouter();

  const { data: instance, isLoading: instanceLoading } = useProcessInstance(
    params.id,
  );
  const { data: variables, isLoading: variablesLoading } = useProcessInstanceVariables(params.id);
  const { data: activities, isLoading: activitiesLoading } = useHistoricActivityInstances(params.id);
  const { data: tasks } = useTasks({ processInstanceId: params.id });

  const getStatus = (): 'active' | 'completed' | 'suspended' | 'failed' => {
    if (!instance) {
      return 'active';
    }
    if (instance.ended) {
      return 'completed';
    }
    if (instance.suspended) {
      return 'suspended';
    }
    return 'active';
  };

  if (instanceLoading || variablesLoading || activitiesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive">
          Process Instance Not Found
        </h3>
        <p className="mt-2 text-sm text-destructive">
          The requested process instance could not be found.
        </p>
      </div>
    );
  }

  const sortedActivities = activities
    ? [...activities].sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          Back to Instances
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            {instance.processDefinitionName || 'Process Instance'}
          </h1>
          <StatusBadge status={getStatus()} />
        </div>
        <p className="mt-2 text-muted-foreground">
          Instance ID:
          {instance.id}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instance Information</CardTitle>
            <CardDescription>Basic details about this instance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {instance.businessKey && (
              <div>
                <p className="text-sm font-medium">Business Key</p>
                <p className="text-sm text-muted-foreground">
                  {instance.businessKey}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Process Definition</p>
              <p className="text-sm text-muted-foreground">
                {instance.processDefinitionKey}
                {' '}
                (v
                {instance.processDefinitionVersion}
                )
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Started</p>
              <p className="text-sm text-muted-foreground">
                {instance.startTime
                  ? `${new Date(instance.startTime).toLocaleString()} (${formatDistanceToNow(new Date(instance.startTime), { addSuffix: true })})`
                  : 'Unknown'}
              </p>
            </div>
            {instance.endTime && (
              <div>
                <p className="text-sm font-medium">Ended</p>
                <p className="text-sm text-muted-foreground">
                  {`${new Date(instance.endTime).toLocaleString()} (${formatDistanceToNow(new Date(instance.endTime), { addSuffix: true })})`}
                </p>
              </div>
            )}
            {instance.durationInMillis && (
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(instance.durationInMillis / 1000 / 60)}
                  {' '}
                  minutes
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Process Variables</CardTitle>
            <CardDescription>Current variable values</CardDescription>
          </CardHeader>
          <CardContent>
            {variables && Object.keys(variables).length > 0
              ? (
                  <div className="space-y-3">
                    {Object.entries(variables).map(([key, variable]) => (
                      <div key={key}>
                        <p className="text-sm font-medium">{key}</p>
                        <p className="text-sm text-muted-foreground">
                          {typeof variable.value === 'object'
                            ? JSON.stringify(variable.value)
                            : String(variable.value)}
                          {' '}
                          <span className="text-xs">
                            (
                            {variable.type}
                            )
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )
              : (
                  <p className="text-sm text-muted-foreground">
                    No variables defined
                  </p>
                )}
          </CardContent>
        </Card>
      </div>

      {tasks && tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
            <CardDescription>
              Tasks currently waiting for completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{task.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.assignee
                        ? `Assigned to: ${task.assignee}`
                        : 'Unassigned'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/${params.locale}/workflows/tasks/${task.id}`,
                      )}
                  >
                    View Task
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            History of activities in this process instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedActivities.length > 0
            ? (
                <div className="space-y-4">
                  {sortedActivities.map((activity, index) => (
                    <div key={activity.id}>
                      <div className="flex items-start gap-4">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <div className="size-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">
                            {activity.activityName || activity.activityId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Type:
                            {' '}
                            {activity.activityType}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Started:
                            {' '}
                            {formatDistanceToNow(new Date(activity.startTime), {
                              addSuffix: true,
                            })}
                          </p>
                          {activity.endTime && (
                            <p className="text-sm text-muted-foreground">
                              Ended:
                              {' '}
                              {formatDistanceToNow(new Date(activity.endTime), {
                                addSuffix: true,
                              })}
                              {' '}
                              (
                              {activity.durationInMillis
                                ? `${Math.round(activity.durationInMillis / 1000)}s`
                                : 'N/A'}
                              )
                            </p>
                          )}
                          {activity.assignee && (
                            <p className="text-sm text-muted-foreground">
                              Assignee:
                              {' '}
                              {activity.assignee}
                            </p>
                          )}
                          {activity.canceled && (
                            <p className="text-sm text-destructive">Canceled</p>
                          )}
                        </div>
                      </div>
                      {index < sortedActivities.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              )
            : (
                <p className="text-sm text-muted-foreground">
                  No activity history available
                </p>
              )}
        </CardContent>
      </Card>
    </div>
  );
}
