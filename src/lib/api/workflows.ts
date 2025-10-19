import { useAuth } from '@clerk/nextjs';

import type {
  Activity,
  CompleteTaskRequest,
  HistoricActivityInstance,
  ProcessDefinition,
  ProcessInstance,
  ProcessInstanceWithVariables,
  StartProcessRequest,
  Task,
  TaskForm,
  Variable,
  WorkflowStats,
} from '@/types/workflow';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class WorkflowApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'WorkflowApiError';
  }
}

export const useWorkflowApi = () => {
  const { getToken } = useAuth();

  const fetchWithAuth = async (
    endpoint: string,
    options: RequestInit = {},
  ) => {
    const token = await getToken();

    if (!token) {
      throw new WorkflowApiError('Authentication required', 401);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new WorkflowApiError(
        errorData.detail || `Request failed with status ${response.status}`,
        response.status,
        errorData,
      );
    }

    return response.json();
  };

  return {
    // Process Definitions
    getProcessDefinitions: async (): Promise<ProcessDefinition[]> => {
      return fetchWithAuth('/api/v1/process-definitions');
    },

    getProcessDefinition: async (key: string): Promise<ProcessDefinition> => {
      return fetchWithAuth(`/api/v1/process-definitions/${key}`);
    },

    getProcessDefinitionXml: async (key: string): Promise<{ bpmn20Xml: string }> => {
      return fetchWithAuth(`/api/v1/process-definitions/${key}/xml`);
    },

    getStartFormVariables: async (key: string): Promise<Record<string, Variable>> => {
      return fetchWithAuth(`/api/v1/process-definitions/${key}/form-variables`);
    },

    // Process Instances
    startProcess: async (
      key: string,
      data: StartProcessRequest,
    ): Promise<ProcessInstance> => {
      return fetchWithAuth(`/api/v1/process-definitions/${key}/start`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getProcessInstances: async (params?: {
      processDefinitionKey?: string;
      businessKey?: string;
      active?: boolean;
      suspended?: boolean;
    }): Promise<ProcessInstance[]> => {
      const queryParams = new URLSearchParams();
      if (params?.processDefinitionKey) {
        queryParams.append('processDefinitionKey', params.processDefinitionKey);
      }
      if (params?.businessKey) {
        queryParams.append('businessKey', params.businessKey);
      }
      if (params?.active !== undefined) {
        queryParams.append('active', String(params.active));
      }
      if (params?.suspended !== undefined) {
        queryParams.append('suspended', String(params.suspended));
      }

      const query = queryParams.toString();
      return fetchWithAuth(`/api/v1/process-instances${query ? `?${query}` : ''}`);
    },

    getProcessInstance: async (id: string): Promise<ProcessInstanceWithVariables> => {
      return fetchWithAuth(`/api/v1/process-instances/${id}`);
    },

    getProcessInstanceVariables: async (id: string): Promise<Record<string, Variable>> => {
      return fetchWithAuth(`/api/v1/process-instances/${id}/variables`);
    },

    deleteProcessInstance: async (id: string, reason?: string): Promise<void> => {
      return fetchWithAuth(`/api/v1/process-instances/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },

    suspendProcessInstance: async (id: string): Promise<void> => {
      return fetchWithAuth(`/api/v1/process-instances/${id}/suspend`, {
        method: 'POST',
      });
    },

    activateProcessInstance: async (id: string): Promise<void> => {
      return fetchWithAuth(`/api/v1/process-instances/${id}/activate`, {
        method: 'POST',
      });
    },

    getActivityInstances: async (id: string): Promise<Activity[]> => {
      return fetchWithAuth(`/api/v1/process-instances/${id}/activity-instances`);
    },

    getHistoricActivityInstances: async (
      processInstanceId: string,
    ): Promise<HistoricActivityInstance[]> => {
      return fetchWithAuth(
        `/api/v1/history/activity-instances?processInstanceId=${processInstanceId}`,
      );
    },

    // Tasks
    getTasks: async (params?: {
      processInstanceId?: string;
      processDefinitionKey?: string;
      assignee?: string;
      unassigned?: boolean;
    }): Promise<Task[]> => {
      const queryParams = new URLSearchParams();
      if (params?.processInstanceId) {
        queryParams.append('processInstanceId', params.processInstanceId);
      }
      if (params?.processDefinitionKey) {
        queryParams.append('processDefinitionKey', params.processDefinitionKey);
      }
      if (params?.assignee) {
        queryParams.append('assignee', params.assignee);
      }
      if (params?.unassigned !== undefined) {
        queryParams.append('unassigned', String(params.unassigned));
      }

      const query = queryParams.toString();
      return fetchWithAuth(`/api/v1/tasks${query ? `?${query}` : ''}`);
    },

    getTask: async (id: string): Promise<Task> => {
      return fetchWithAuth(`/api/v1/tasks/${id}`);
    },

    getTaskFormVariables: async (id: string): Promise<Record<string, Variable>> => {
      return fetchWithAuth(`/api/v1/tasks/${id}/form-variables`);
    },

    getTaskForm: async (id: string): Promise<TaskForm> => {
      return fetchWithAuth(`/api/v1/tasks/${id}/form`);
    },

    completeTask: async (
      id: string,
      data: CompleteTaskRequest,
    ): Promise<void> => {
      return fetchWithAuth(`/api/v1/tasks/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    claimTask: async (id: string, userId: string): Promise<void> => {
      return fetchWithAuth(`/api/v1/tasks/${id}/claim`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },

    unclaimTask: async (id: string): Promise<void> => {
      return fetchWithAuth(`/api/v1/tasks/${id}/unclaim`, {
        method: 'POST',
      });
    },

    // Statistics
    getWorkflowStats: async (): Promise<WorkflowStats> => {
      return fetchWithAuth('/api/v1/statistics');
    },
  };
};

// Helper function to create variable objects
export const createVariable = (value: any, type: string): Variable => {
  return {
    value,
    type: type as any,
  };
};

// Helper function to convert form data to variables
export const formDataToVariables = (
  formData: Record<string, any>,
): Record<string, Variable> => {
  const variables: Record<string, Variable> = {};

  Object.entries(formData).forEach(([key, value]) => {
    let type = 'String';

    if (typeof value === 'boolean') {
      type = 'Boolean';
    } else if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'Integer' : 'Double';
    } else if (value instanceof Date) {
      type = 'Date';
      value = value.toISOString();
    } else if (typeof value === 'object' && value !== null) {
      type = 'Json';
      value = JSON.stringify(value);
    }

    variables[key] = createVariable(value, type);
  });

  return variables;
};

// Helper function to convert variables to form data
export const variablesToFormData = (
  variables: Record<string, Variable>,
): Record<string, any> => {
  const formData: Record<string, any> = {};

  Object.entries(variables).forEach(([key, variable]) => {
    let value = variable.value;

    if (variable.type === 'Date' && typeof value === 'string') {
      value = new Date(value);
    } else if (variable.type === 'Json' && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        // Keep as string if parsing fails
      }
    }

    formData[key] = value;
  });

  return formData;
};
