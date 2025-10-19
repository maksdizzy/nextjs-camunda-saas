import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { ProcessDefinition } from '@/types/workflow';

type ProcessCardProps = {
  process: ProcessDefinition;
  locale: string;
};

export const ProcessCard = ({ process, locale }: ProcessCardProps) => {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{process.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Key:
            {' '}
            {process.key}
          </p>
          <p className="text-sm text-muted-foreground">
            Version:
            {' '}
            {process.version}
          </p>
        </div>

        <div className="ml-4 flex flex-col gap-2">
          <Link href={`/${locale}/workflows/${process.key}/start`}>
            <Button size="sm">Start Process</Button>
          </Link>
          <Link href={`/${locale}/workflows/instances?process=${process.key}`}>
            <Button size="sm" variant="outline">
              View Instances
            </Button>
          </Link>
        </div>
      </div>

      {process.versionTag && (
        <div className="mt-4">
          <span className="inline-block rounded-full bg-secondary px-2 py-1 text-xs">
            {process.versionTag}
          </span>
        </div>
      )}
    </div>
  );
};
