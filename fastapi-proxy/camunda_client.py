"""Camunda Engine REST API client."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import base64
import httpx
import jwt
from fastapi import HTTPException, status

from config import get_settings
from models import (
    ProcessDefinition,
    ProcessInstance,
    Task,
    UserClaims,
    Variable,
)

logger = logging.getLogger(__name__)


class CamundaClient:
    """Async HTTP client for Camunda Engine REST API."""

    def __init__(self):
        """Initialize Camunda client with settings."""
        self.settings = get_settings()
        self.base_url = self.settings.engine_url.rstrip("/")
        self.auth = (self.settings.engine_user, self.settings.engine_pass)
        self.timeout = self.settings.engine_timeout

    def _generate_engine_jwt(self) -> str:
        """Generate JWT token for Camunda Engine authentication."""
        # Decode base64 secret
        try:
            secret = base64.b64decode(self.settings.engine_jwt_secret)
        except Exception:
            # If not base64, use as-is
            secret = self.settings.engine_jwt_secret

        now = datetime.utcnow()
        payload = {
            "sub": self.settings.engine_user,
            "email": f"{self.settings.engine_user}@camunda.local",  # Required by engine
            "isActive": True,  # Required by engine (camelCase!)
            "isSuperuser": True,  # Required by engine (grants admin access, camelCase!)
            "isVerified": True,  # Required by engine (camelCase!)
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp())
        }

        token = jwt.encode(
            payload,
            secret,
            algorithm=self.settings.engine_jwt_algorithm
        )
        return token

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        Make HTTP request to Camunda Engine.

        Args:
            method: HTTP method (GET, POST, etc.)
            path: API endpoint path
            params: Query parameters
            json: Request body as JSON

        Returns:
            Response data as dict or list

        Raises:
            HTTPException: If request fails
        """
        url = f"{self.base_url}/{path.lstrip('/')}"

        # Generate JWT token for engine authentication
        engine_token = self._generate_engine_jwt()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    headers={"Authorization": f"Bearer {engine_token}"},
                )

                # Handle non-2xx responses
                if response.status_code >= 400:
                    error_detail = response.text
                    try:
                        error_json = response.json()
                        error_detail = error_json.get("message", error_detail)
                    except Exception:
                        pass

                    logger.error(
                        f"Camunda API error: {response.status_code} - {error_detail}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Engine error: {error_detail}",
                    )

                # Return JSON response or None for 204
                if response.status_code == 204:
                    return None
                return response.json()

        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to Camunda Engine at {url}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Engine request timeout",
            )
        except httpx.ConnectError:
            logger.error(f"Failed to connect to Camunda Engine at {url}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Cannot connect to Engine",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error calling Camunda API: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error: {str(e)}",
            )

    async def health_check(self) -> bool:
        """
        Check if Camunda Engine is reachable.

        Returns:
            True if engine is reachable, False otherwise
        """
        try:
            await self._request("GET", "/version")
            return True
        except Exception as e:
            logger.warning(f"Engine health check failed: {str(e)}")
            return False

    async def get_process_definitions(self) -> List[ProcessDefinition]:
        """
        Get all process definitions.

        Returns:
            List of process definitions
        """
        data = await self._request("GET", "/process-definition")
        return [ProcessDefinition(**item) for item in data]

    async def get_process_definition_by_key(
        self, key: str
    ) -> Optional[ProcessDefinition]:
        """
        Get latest process definition by key.

        Args:
            key: Process definition key

        Returns:
            Process definition or None if not found
        """
        try:
            data = await self._request("GET", f"/process-definition/key/{key}")
            return ProcessDefinition(**data)
        except HTTPException as e:
            if e.status_code == status.HTTP_502_BAD_GATEWAY:
                return None
            raise

    async def get_start_form_variables(self, key: str) -> Dict[str, Any]:
        """
        Get start form variables for a process definition.

        Args:
            key: Process definition key

        Returns:
            Dictionary of form variables
        """
        try:
            data = await self._request(
                "GET", f"/process-definition/key/{key}/form-variables"
            )
            return data or {}
        except HTTPException as e:
            if e.status_code == status.HTTP_502_BAD_GATEWAY:
                return {}
            raise

    async def start_process_instance(
        self,
        key: str,
        variables: Dict[str, Any],
        business_key: Optional[str] = None,
        user: Optional[UserClaims] = None,
    ) -> ProcessInstance:
        """
        Start a new process instance.

        Args:
            key: Process definition key
            variables: Process variables
            business_key: Optional business key
            user: Optional user claims to add to process variables

        Returns:
            Created process instance
        """
        # Transform variables to Camunda format
        camunda_variables = {
            name: {"value": value, "type": self._infer_type(value)}
            for name, value in variables.items()
        }

        # Add user information to variables if provided
        if user:
            camunda_variables["initiator"] = {"value": user.sub, "type": "String"}
            camunda_variables["initiatorEmail"] = {
                "value": user.email or "",
                "type": "String",
            }
            camunda_variables["initiatorName"] = {
                "value": user.full_name,
                "type": "String",
            }

        payload = {"variables": camunda_variables}
        if business_key:
            payload["businessKey"] = business_key

        data = await self._request(
            "POST", f"/process-definition/key/{key}/start", json=payload
        )
        return ProcessInstance(**data)

    async def get_tasks(
        self, assignee: Optional[str] = None, process_instance_id: Optional[str] = None
    ) -> List[Task]:
        """
        Get tasks, optionally filtered by assignee or process instance.

        Args:
            assignee: Filter by assignee
            process_instance_id: Filter by process instance ID

        Returns:
            List of tasks
        """
        params = {}
        if assignee:
            params["assignee"] = assignee
        if process_instance_id:
            params["processInstanceId"] = process_instance_id

        data = await self._request("GET", "/task", params=params)
        return [Task(**item) for item in data]

    async def get_task_form_variables(self, task_id: str) -> Dict[str, Variable]:
        """
        Get form variables for a task.

        Args:
            task_id: Task ID

        Returns:
            Dictionary of form variables
        """
        try:
            data = await self._request("GET", f"/task/{task_id}/form-variables")
            return {name: Variable(**var) for name, var in (data or {}).items()}
        except HTTPException as e:
            if e.status_code == status.HTTP_502_BAD_GATEWAY:
                return {}
            raise

    async def complete_task(
        self, task_id: str, variables: Dict[str, Any]
    ) -> Optional[Dict[str, Variable]]:
        """
        Complete a task with variables.

        Args:
            task_id: Task ID
            variables: Task variables

        Returns:
            Updated variables if withVariablesInReturn was true
        """
        # Transform variables to Camunda format
        camunda_variables = {
            name: {"value": value, "type": self._infer_type(value)}
            for name, value in variables.items()
        }

        payload = {"variables": camunda_variables}

        data = await self._request("POST", f"/task/{task_id}/complete", json=payload)

        if data:
            return {name: Variable(**var) for name, var in data.items()}
        return None

    async def get_process_instances(
        self, process_definition_key: Optional[str] = None
    ) -> List[ProcessInstance]:
        """
        Get process instances, optionally filtered by definition key.

        Args:
            process_definition_key: Filter by process definition key

        Returns:
            List of process instances
        """
        params = {}
        if process_definition_key:
            params["processDefinitionKey"] = process_definition_key

        data = await self._request("GET", "/process-instance", params=params)
        return [ProcessInstance(**item) for item in data]

    async def get_process_instance(self, instance_id: str) -> Optional[ProcessInstance]:
        """
        Get a specific process instance.

        Args:
            instance_id: Process instance ID

        Returns:
            Process instance or None if not found
        """
        try:
            data = await self._request("GET", f"/process-instance/{instance_id}")
            return ProcessInstance(**data)
        except HTTPException as e:
            if e.status_code == status.HTTP_502_BAD_GATEWAY:
                return None
            raise

    async def get_process_instance_variables(
        self, instance_id: str
    ) -> Dict[str, Variable]:
        """
        Get variables for a process instance.

        Args:
            instance_id: Process instance ID

        Returns:
            Dictionary of variables
        """
        try:
            data = await self._request(
                "GET", f"/process-instance/{instance_id}/variables"
            )
            return {name: Variable(**var) for name, var in (data or {}).items()}
        except HTTPException as e:
            if e.status_code == status.HTTP_502_BAD_GATEWAY:
                return {}
            raise

    @staticmethod
    def _infer_type(value: Any) -> str:
        """
        Infer Camunda variable type from Python value.

        Args:
            value: Python value

        Returns:
            Camunda type string
        """
        if isinstance(value, bool):
            return "Boolean"
        elif isinstance(value, int):
            return "Integer"
        elif isinstance(value, float):
            return "Double"
        elif isinstance(value, str):
            return "String"
        elif isinstance(value, (list, dict)):
            return "Json"
        else:
            return "String"
