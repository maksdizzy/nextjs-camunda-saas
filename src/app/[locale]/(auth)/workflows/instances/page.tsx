/* eslint-disable no-alert, react/no-array-index-key */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { InstanceCard } from '@/components/workflows/InstanceCard';
import { useProcessInstances } from '@/hooks/useProcessInstance';
import { useWorkflowApi } from '@/lib/api/workflows';

export default function ProcessInstancesPage({
  params,
}: {
  params: { locale: string };
}) {
  const api = useWorkflowApi();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'completed' | 'suspended'
  >('all');

  const {
    data: instances,
    isLoading,
    error,
  } = useProcessInstances(
    filterStatus === 'all'
      ? undefined
      : {
          active: filterStatus === 'active',
          suspended: filterStatus === 'suspended',
        },
  );

  const suspendMutation = useMutation({
    mutationFn: (instanceId: string) => api.suspendProcessInstance(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-instances'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (instanceId: string) => api.activateProcessInstance(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-instances'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (instanceId: string) =>
      api.deleteProcessInstance(instanceId, 'Cancelled by user'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-instances'] });
    },
  });

  const filteredInstances = instances?.filter((instance) => {
    const matchesSearch
      = instance.id.toLowerCase().includes(searchQuery.toLowerCase())
      || instance.businessKey?.toLowerCase().includes(searchQuery.toLowerCase())
      || instance.processDefinitionKey
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus
      = filterStatus === 'all'
      || (filterStatus === 'active' && !instance.ended && !instance.suspended)
      || (filterStatus === 'completed' && instance.ended)
      || (filterStatus === 'suspended' && instance.suspended);

    return matchesSearch && matchesStatus;
  });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive">
          Error Loading Process Instances
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
        <h1 className="text-3xl font-bold">Process Instances</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your process instances
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search by ID, business key, or process..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'suspended', 'completed'] as const).map(
            status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ),
          )}
        </div>
      </div>

      {isLoading
        ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-56 w-full" />
              ))}
            </div>
          )
        : filteredInstances && filteredInstances.length > 0
          ? (
              <div className="space-y-4">
                {filteredInstances.map(instance => (
                  <InstanceCard
                    key={instance.id}
                    instance={instance}
                    locale={params.locale}
                    onSuspend={(id) => {
                      if (
                        confirm('Are you sure you want to suspend this instance?')
                      ) {
                        suspendMutation.mutate(id);
                      }
                    }}
                    onActivate={(id) => {
                      activateMutation.mutate(id);
                    }}
                    onDelete={(id) => {
                      if (
                        confirm(
                          'Are you sure you want to cancel this instance? This action cannot be undone.',
                        )
                      ) {
                        deleteMutation.mutate(id);
                      }
                    }}
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold">
                  No Process Instances Found
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start a process to create your first instance'}
                </p>
              </div>
            )}

      {(suspendMutation.isError
        || activateMutation.isError
        || deleteMutation.isError) && (
        <div className="fixed bottom-4 right-4 rounded-md border border-destructive bg-destructive/10 p-4 shadow-lg">
          <p className="text-sm text-destructive">
            {(suspendMutation.error
              || activateMutation.error
              || deleteMutation.error) instanceof Error
              ? (
                  suspendMutation.error
                  || activateMutation.error
                  || deleteMutation.error
                )?.message
              : 'Operation failed'}
          </p>
        </div>
      )}
    </div>
  );
}
