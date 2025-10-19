import { useQuery } from '@tanstack/react-query';

import { useWorkflowApi } from '@/lib/api/workflows';

export const useProcesses = () => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['processes'],
    queryFn: () => api.getProcessDefinitions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};

export const useProcess = (key: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['process', key],
    queryFn: () => api.getProcessDefinition(key),
    enabled: !!key,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProcessXml = (key: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['process-xml', key],
    queryFn: () => api.getProcessDefinitionXml(key),
    enabled: !!key,
    staleTime: 10 * 60 * 1000, // 10 minutes (XML rarely changes)
  });
};

export const useStartFormVariables = (key: string) => {
  const api = useWorkflowApi();

  return useQuery({
    queryKey: ['start-form-variables', key],
    queryFn: () => api.getStartFormVariables(key),
    enabled: !!key,
    staleTime: 5 * 60 * 1000,
  });
};
