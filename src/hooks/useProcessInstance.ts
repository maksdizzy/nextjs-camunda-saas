import { useQuery } from '@tanstack/react-query';

import { useWorkflowApi } from '@/lib/api/workflows';

export const useProcessInstances = (params?: {
  processDefinitionKey?: string;
  businessKey?: string;
  active?: boolean;
  suspended?: boolean;
}) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['process-instances', params],
    queryFn: () => api.getProcessInstances(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

export const useProcessInstance = (id: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['process-instance', id],
    queryFn: () => api.getProcessInstance(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
};

export const useProcessInstanceVariables = (id: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['process-instance-variables', id],
    queryFn: () => api.getProcessInstanceVariables(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

export const useActivityInstances = (id: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['activity-instances', id],
    queryFn: () => api.getActivityInstances(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
};

export const useHistoricActivityInstances = (processInstanceId: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['historic-activity-instances', processInstanceId],
    queryFn: () => api.getHistoricActivityInstances(processInstanceId),
    enabled: !!processInstanceId,
    staleTime: 60 * 1000, // 1 minute (history changes less frequently)
  });
};

export const useWorkflowStats = () => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['workflow-stats'],
    queryFn: () => api.getWorkflowStats(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
};
