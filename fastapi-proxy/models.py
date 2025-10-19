"""Pydantic models for request/response validation."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class UserClaims(BaseModel):
    """User claims extracted from Clerk JWT."""

    sub: str = Field(..., description="User ID from Clerk")
    email: Optional[str] = Field(None, description="User email")
    first_name: Optional[str] = Field(None, description="User first name")
    last_name: Optional[str] = Field(None, description="User last name")

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        parts = [self.first_name, self.last_name]
        return " ".join(filter(None, parts)) or self.email or self.sub


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    engine_url: str
    engine_reachable: bool


class ProcessDefinition(BaseModel):
    """Process definition from Camunda."""

    id: str
    key: str
    category: Optional[str] = None
    description: Optional[str] = None
    name: Optional[str] = None
    version: int
    resource: Optional[str] = None
    deployment_id: Optional[str] = Field(None, alias="deploymentId")
    diagram: Optional[str] = None
    suspended: bool = False
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    version_tag: Optional[str] = Field(None, alias="versionTag")

    class Config:
        populate_by_name = True


class FormVariable(BaseModel):
    """Form variable definition."""

    id: str
    label: Optional[str] = None
    type: str
    default_value: Optional[Any] = Field(None, alias="defaultValue")
    validation: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True


class FormDefinition(BaseModel):
    """Form definition with variables."""

    key: str
    variables: List[FormVariable] = []


class StartProcessRequest(BaseModel):
    """Request to start a process instance."""

    variables: Dict[str, Any] = Field(default_factory=dict)
    business_key: Optional[str] = Field(None, alias="businessKey")

    class Config:
        populate_by_name = True


class ProcessInstance(BaseModel):
    """Process instance from Camunda."""

    id: str
    definition_id: str = Field(..., alias="definitionId")
    business_key: Optional[str] = Field(None, alias="businessKey")
    case_instance_id: Optional[str] = Field(None, alias="caseInstanceId")
    ended: bool = False
    suspended: bool = False
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    links: Optional[List[Dict[str, str]]] = None

    class Config:
        populate_by_name = True


class Task(BaseModel):
    """Task from Camunda."""

    id: str
    name: Optional[str] = None
    assignee: Optional[str] = None
    created: datetime
    due: Optional[datetime] = None
    follow_up: Optional[datetime] = Field(None, alias="followUp")
    delegation_state: Optional[str] = Field(None, alias="delegationState")
    description: Optional[str] = None
    execution_id: str = Field(..., alias="executionId")
    owner: Optional[str] = None
    parent_task_id: Optional[str] = Field(None, alias="parentTaskId")
    priority: int = 50
    process_definition_id: str = Field(..., alias="processDefinitionId")
    process_instance_id: str = Field(..., alias="processInstanceId")
    task_definition_key: str = Field(..., alias="taskDefinitionKey")
    case_execution_id: Optional[str] = Field(None, alias="caseExecutionId")
    case_instance_id: Optional[str] = Field(None, alias="caseInstanceId")
    case_definition_id: Optional[str] = Field(None, alias="caseDefinitionId")
    suspended: bool = False
    form_key: Optional[str] = Field(None, alias="formKey")
    tenant_id: Optional[str] = Field(None, alias="tenantId")

    class Config:
        populate_by_name = True


class CompleteTaskRequest(BaseModel):
    """Request to complete a task."""

    variables: Dict[str, Any] = Field(default_factory=dict)
    with_variables_in_return: bool = Field(False, alias="withVariablesInReturn")

    class Config:
        populate_by_name = True


class Variable(BaseModel):
    """Variable value from Camunda."""

    value: Any
    type: str
    value_info: Optional[Dict[str, Any]] = Field(None, alias="valueInfo")

    class Config:
        populate_by_name = True


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
