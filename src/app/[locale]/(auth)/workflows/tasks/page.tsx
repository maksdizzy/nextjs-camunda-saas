/* eslint-disable react/no-array-index-key */
'use client';

import { useUser } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard } from '@/components/workflows/TaskCard';
import { useTasks } from '@/hooks/useTasks';
import { useWorkflowApi } from '@/lib/api/workflows';

export default function TasksPage({
  params,
}: {
  params: { locale: string };
}) {
  const { user } = useUser();
  const api = useWorkflowApi();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProcess, setFilterProcess] = useState('');

  const { data: tasks, isLoading, error } = useTasks();

  const claimTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return api.claimTask(taskId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch
      = task.name.toLowerCase().includes(searchQuery.toLowerCase())
      || task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProcess
      = !filterProcess
      || task.processDefinitionId.includes(filterProcess);

    return matchesSearch && matchesProcess;
  });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive">
          Error Loading Tasks
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
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <p className="mt-2 text-muted-foreground">
          Tasks assigned to you or available to claim
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search tasks by name or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="sm:w-64">
          <Input
            type="text"
            placeholder="Filter by process..."
            value={filterProcess}
            onChange={e => setFilterProcess(e.target.value)}
          />
        </div>
      </div>

      {isLoading
        ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          )
        : filteredTasks && filteredTasks.length > 0
          ? (
              <div className="space-y-4">
                {filteredTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    locale={params.locale}
                    onClaim={(taskId) => {
                      claimTaskMutation.mutate(taskId);
                    }}
                    isClaimable={!task.assignee}
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold">No Tasks Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || filterProcess
                    ? 'Try adjusting your search criteria'
                    : 'You have no active tasks at the moment'}
                </p>
              </div>
            )}

      {claimTaskMutation.isError && (
        <div className="fixed bottom-4 right-4 rounded-md border border-destructive bg-destructive/10 p-4 shadow-lg">
          <p className="text-sm text-destructive">
            {claimTaskMutation.error instanceof Error
              ? claimTaskMutation.error.message
              : 'Failed to claim task'}
          </p>
        </div>
      )}
    </div>
  );
}
