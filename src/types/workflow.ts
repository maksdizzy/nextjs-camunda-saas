export type ProcessDefinition = {
  id: string;
  key: string;
  name: string;
  version: number;
  resource: string;
  deploymentId: string;
  diagram?: string;
  tenantId?: string;
  versionTag?: string;
  historyTimeToLive?: number;
  startableInTasklist: boolean;
};

export type ProcessInstance = {
  id: string;
  definitionId: string;
  businessKey?: string;
  caseInstanceId?: string;
  ended: boolean;
  suspended: boolean;
  tenantId?: string;
  processDefinitionKey?: string;
  processDefinitionName?: string;
  processDefinitionVersion?: number;
  startTime?: string;
  endTime?: string;
  durationInMillis?: number;
};

export type Task = {
  id: string;
  name: string;
  assignee?: string;
  created: string;
  due?: string;
  followUp?: string;
  delegationState?: 'PENDING' | 'RESOLVED';
  description?: string;
  executionId: string;
  owner?: string;
  parentTaskId?: string;
  priority: number;
  processDefinitionId: string;
  processInstanceId: string;
  taskDefinitionKey: string;
  caseExecutionId?: string;
  caseInstanceId?: string;
  caseDefinitionId?: string;
  suspended: boolean;
  formKey?: string;
  tenantId?: string;
};

export type Variable = {
  value: any;
  type: VariableType;
  valueInfo?: Record<string, any>;
};

export type VariableType =
  | 'String'
  | 'Boolean'
  | 'Integer'
  | 'Long'
  | 'Double'
  | 'Date'
  | 'Json'
  | 'Null';

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  defaultValue?: any;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  properties?: Record<string, any>;
};

export type FormFieldType =
  | 'string'
  | 'long'
  | 'boolean'
  | 'date'
  | 'enum';

export type TaskForm = {
  key: string;
  contextPath?: string;
  fields: FormField[];
};

export type StartProcessRequest = {
  variables?: Record<string, Variable>;
  businessKey?: string;
};

export type CompleteTaskRequest = {
  variables?: Record<string, Variable>;
};

export type ProcessInstanceWithVariables = {
  variables?: Record<string, Variable>;
} & ProcessInstance;

export type Activity = {
  id: string;
  parentActivityInstanceId?: string;
  activityId: string;
  activityName?: string;
  activityType: string;
  processInstanceId: string;
  processDefinitionId: string;
  executionIds: string[];
  startTime: string;
  endTime?: string;
  durationInMillis?: number;
  canceled: boolean;
  completeScope: boolean;
  incidents?: any[];
};

export type HistoricActivityInstance = {
  id: string;
  parentActivityInstanceId?: string;
  activityId: string;
  activityName?: string;
  activityType: string;
  processDefinitionKey: string;
  processDefinitionId: string;
  processInstanceId: string;
  executionId: string;
  taskId?: string;
  assignee?: string;
  calledProcessInstanceId?: string;
  calledCaseInstanceId?: string;
  startTime: string;
  endTime?: string;
  durationInMillis?: number;
  canceled: boolean;
  completeScope: boolean;
  tenantId?: string;
  removalTime?: string;
  rootProcessInstanceId: string;
};

export type WorkflowStats = {
  totalProcesses: number;
  activeInstances: number;
  completedInstances: number;
  activeTasks: number;
};
