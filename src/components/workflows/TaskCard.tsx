import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/workflows/StatusBadge';
import type { Task } from '@/types/workflow';

type TaskCardProps = {
  task: Task;
  locale: string;
  onClaim?: (taskId: string) => void;
  isClaimable?: boolean;
};

export const TaskCard = ({
  task,
  locale,
  onClaim,
  isClaimable = false,
}: TaskCardProps) => {
  const createdAgo = formatDistanceToNow(new Date(task.created), {
    addSuffix: true,
  });

  const getStatus = () => {
    if (task.suspended) {
      return 'suspended';
    }
    if (task.assignee) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-lg font-semibold">{task.name}</h3>
            <StatusBadge status={getStatus()} />
          </div>

          {task.description && (
            <p className="mb-3 text-sm text-muted-foreground">
              {task.description}
            </p>
          )}

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Created:
              {createdAgo}
            </p>
            {task.assignee && (
              <p>
                Assignee:
                {task.assignee}
              </p>
            )}
            {task.due && (
              <p>
                Due:
                {' '}
                {formatDistanceToNow(new Date(task.due), { addSuffix: true })}
              </p>
            )}
            <p>
              Priority:
              {task.priority}
            </p>
          </div>
        </div>

        <div className="ml-4 flex flex-col gap-2">
          {isClaimable && !task.assignee && onClaim && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClaim(task.id)}
            >
              Claim Task
            </Button>
          )}

          {task.assignee && (
            <Link href={`/${locale}/workflows/tasks/${task.id}`}>
              <Button size="sm">Complete Task</Button>
            </Link>
          )}

          <Link
            href={`/${locale}/workflows/instances/${task.processInstanceId}`}
          >
            <Button size="sm" variant="outline">
              View Instance
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
