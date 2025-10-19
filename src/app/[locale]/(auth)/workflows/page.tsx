/* eslint-disable react/no-array-index-key */
'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessCard } from '@/components/workflows/ProcessCard';
import { useProcesses } from '@/hooks/useProcesses';

export default function WorkflowsPage({
  params,
}: {
  params: { locale: string };
}) {
  const { data: processes, isLoading, error } = useProcesses();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProcesses = processes?.filter(
    process =>
      process.name.toLowerCase().includes(searchQuery.toLowerCase())
      || process.key.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive">
          Error Loading Processes
        </h3>
        <p className="mt-2 text-sm text-destructive">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow Processes</h1>
        <p className="mt-2 text-muted-foreground">
          Browse and start available workflow processes
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search processes by name or key..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {isLoading
        ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          )
        : filteredProcesses && filteredProcesses.length > 0
          ? (
              <div className="space-y-4">
                {filteredProcesses.map(process => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    locale={params.locale}
                  />
                ))}
              </div>
            )
          : (
              <div className="rounded-lg border p-12 text-center">
                <svg
                  className="mx-auto size-12 text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold">No Processes Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search criteria'
                    : 'No workflow processes are currently available'}
                </p>
              </div>
            )}
    </div>
  );
}
