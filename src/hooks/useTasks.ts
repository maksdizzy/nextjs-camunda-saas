import { useQuery } from '@tanstack/react-query';

import { useWorkflowApi } from '@/lib/api/workflows';

export const useTasks = (params?: {
  processInstanceId?: string;
  processDefinitionKey?: string;
  assignee?: string;
  unassigned?: boolean;
}) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.getTasks(params),
    staleTime: 30 * 1000, // 30 seconds (tasks change frequently)
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

export const useTask = (id: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.getTask(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

export const useTaskFormVariables = (id: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['task-form-variables', id],
    queryFn: () => api.getTaskFormVariables(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

export const useTaskForm = (id: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['task-form', id],
    queryFn: () => api.getTaskForm(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes (form structure rarely changes)
  });
};
