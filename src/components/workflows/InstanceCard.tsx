import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/workflows/StatusBadge';
import type { ProcessInstance } from '@/types/workflow';

type InstanceCardProps = {
  instance: ProcessInstance;
  locale: string;
  onSuspend?: (instanceId: string) => void;
  onActivate?: (instanceId: string) => void;
  onDelete?: (instanceId: string) => void;
};

export const InstanceCard = ({
  instance,
  locale,
  onSuspend,
  onActivate,
  onDelete,
}: InstanceCardProps) => {
  const getStatus = (): 'active' | 'completed' | 'suspended' | 'failed' => {
    if (instance.ended) {
      return 'completed';
    }
    if (instance.suspended) {
      return 'suspended';
    }
    return 'active';
  };

  const startedAgo = instance.startTime
    ? formatDistanceToNow(new Date(instance.startTime), { addSuffix: true })
    : 'Unknown';

  const duration = instance.durationInMillis
    ? `${Math.round(instance.durationInMillis / 1000 / 60)} minutes`
    : null;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold">
              {instance.processDefinitionName || 'Process Instance'}
            </h3>
            <StatusBadge status={getStatus()} />
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              ID:
              {instance.id}
            </p>
            {instance.businessKey && (
              <p>
                Business Key:
                {instance.businessKey}
              </p>
            )}
            {instance.processDefinitionKey && (
              <p>
                Process:
                {instance.processDefinitionKey}
              </p>
            )}
            {instance.processDefinitionVersion && (
              <p>
                Version:
                {instance.processDefinitionVersion}
              </p>
            )}
            <p>
              Started:
              {startedAgo}
            </p>
            {instance.endTime && (
              <p>
                Ended:
                {' '}
                {formatDistanceToNow(new Date(instance.endTime), {
                  addSuffix: true,
                })}
              </p>
            )}
            {duration && (
              <p>
                Duration:
                {duration}
              </p>
            )}
          </div>
        </div>

        <div className="ml-4 flex flex-col gap-2">
          <Link href={`/${locale}/workflows/instances/${instance.id}`}>
            <Button size="sm">View Details</Button>
          </Link>

          {!instance.ended && (
            <>
              {instance.suspended
                ? (
                    onActivate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onActivate(instance.id)}
                      >
                        Resume
                      </Button>
                    )
                  )
                : (
                    onSuspend && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSuspend(instance.id)}
                      >
                        Suspend
                      </Button>
                    )
                  )}

              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(instance.id)}
                >
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
