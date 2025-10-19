"""FastAPI proxy for Clerk authentication with Camunda Engine."""
import logging
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from models import (
    HealthResponse,
    ProcessDefinition,
    ProcessInstance,
    Task,
    Variable,
    StartProcessRequest,
    CompleteTaskRequest,
    UserClaims,
    ErrorResponse,
)
from auth import verify_clerk_token
from camunda_client import CamundaClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Engine URL: {settings.engine_url}")
    logger.info(f"CORS Origins: {settings.cors_origins}")

    # Startup: verify engine connectivity
    client = CamundaClient()
    engine_ok = await client.health_check()
    if engine_ok:
        logger.info("✓ Camunda Engine is reachable")
    else:
        logger.warning("✗ Camunda Engine is not reachable at startup")

    yield

    # Shutdown
    logger.info("Shutting down application")


# Initialize FastAPI app
app = FastAPI(
    title="Clerk-Camunda Proxy",
    description="Authentication proxy for Clerk JWT to Camunda Engine BasicAuth",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error=exc.detail, detail=str(exc.detail)).model_dump(mode='json'),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error", detail="An unexpected error occurred"
        ).model_dump(mode='json'),
    )


# Health check endpoint (no auth required)
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns service status and engine connectivity.
    """
    client = CamundaClient()
    engine_reachable = await client.health_check()

    return HealthResponse(
        status="healthy" if engine_reachable else "degraded",
        engine_url=settings.engine_url,
        engine_reachable=engine_reachable,
    )


# Process Definition endpoints
@app.get(
    "/api/processes",
    response_model=List[ProcessDefinition],
    tags=["Process Definitions"],
)
async def list_processes(user: UserClaims = Depends(verify_clerk_token)):
    """
    List all process definitions.

    Requires authentication.
    """
    logger.info(f"User {user.sub} listing process definitions")
    client = CamundaClient()
    return await client.get_process_definitions()


@app.get(
    "/api/processes/{key}",
    response_model=ProcessDefinition,
    tags=["Process Definitions"],
)
async def get_process(key: str, user: UserClaims = Depends(verify_clerk_token)):
    """
    Get process definition by key.

    Requires authentication.
    """
    logger.info(f"User {user.sub} getting process definition: {key}")
    client = CamundaClient()
    process_def = await client.get_process_definition_by_key(key)

    if not process_def:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Process definition '{key}' not found",
        )

    return process_def


@app.get(
    "/api/processes/{key}/form",
    response_model=Dict[str, Variable],
    tags=["Process Definitions"],
)
async def get_start_form(key: str, user: UserClaims = Depends(verify_clerk_token)):
    """
    Get start form variables for a process definition.

    Requires authentication.
    """
    logger.info(f"User {user.sub} getting start form for: {key}")
    client = CamundaClient()
    return await client.get_start_form_variables(key)


@app.post(
    "/api/processes/{key}/start",
    response_model=ProcessInstance,
    status_code=status.HTTP_201_CREATED,
    tags=["Process Instances"],
)
async def start_process(
    key: str,
    request: StartProcessRequest,
    user: UserClaims = Depends(verify_clerk_token),
):
    """
    Start a new process instance.

    Automatically adds user information to process variables:
    - initiator: User ID
    - initiatorEmail: User email
    - initiatorName: User full name

    Requires authentication.
    """
    logger.info(f"User {user.sub} starting process: {key}")
    client = CamundaClient()

    instance = await client.start_process_instance(
        key=key,
        variables=request.variables,
        business_key=request.business_key,
        user=user,
    )

    logger.info(f"Created process instance: {instance.id}")
    return instance


# Task endpoints
@app.get("/api/tasks", response_model=List[Task], tags=["Tasks"])
async def list_tasks(
    assignee: Optional[str] = Query(None, description="Filter by assignee"),
    process_instance_id: Optional[str] = Query(
        None, alias="processInstanceId", description="Filter by process instance ID"
    ),
    user: UserClaims = Depends(verify_clerk_token),
):
    """
    List tasks, optionally filtered.

    If no filters provided, returns all tasks.
    Use assignee to filter by assigned user.
    Use processInstanceId to filter by process instance.

    Requires authentication.
    """
    logger.info(f"User {user.sub} listing tasks (assignee={assignee}, instance={process_instance_id})")
    client = CamundaClient()
    return await client.get_tasks(
        assignee=assignee, process_instance_id=process_instance_id
    )


@app.get("/api/tasks/{task_id}", response_model=Task, tags=["Tasks"])
async def get_task(task_id: str, user: UserClaims = Depends(verify_clerk_token)):
    """
    Get a specific task by ID.

    Requires authentication.
    """
    logger.info(f"User {user.sub} getting task: {task_id}")
    client = CamundaClient()
    tasks = await client.get_tasks()
    task = next((t for t in tasks if t.id == task_id), None)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Task '{task_id}' not found"
        )

    return task


@app.get(
    "/api/tasks/{task_id}/form",
    response_model=Dict[str, Variable],
    tags=["Tasks"],
)
async def get_task_form(task_id: str, user: UserClaims = Depends(verify_clerk_token)):
    """
    Get form variables for a task.

    Requires authentication.
    """
    logger.info(f"User {user.sub} getting task form: {task_id}")
    client = CamundaClient()
    return await client.get_task_form_variables(task_id)


@app.post(
    "/api/tasks/{task_id}/complete",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Tasks"],
)
async def complete_task(
    task_id: str,
    request: CompleteTaskRequest,
    user: UserClaims = Depends(verify_clerk_token),
):
    """
    Complete a task with variables.

    Requires authentication.
    """
    logger.info(f"User {user.sub} completing task: {task_id}")
    client = CamundaClient()
    await client.complete_task(task_id, request.variables)
    logger.info(f"Task {task_id} completed successfully")
    return None


# Process Instance endpoints
@app.get("/api/instances", response_model=List[ProcessInstance], tags=["Process Instances"])
async def list_instances(
    process_definition_key: Optional[str] = Query(
        None, alias="processDefinitionKey", description="Filter by process definition key"
    ),
    user: UserClaims = Depends(verify_clerk_token),
):
    """
    List process instances, optionally filtered by definition key.

    Requires authentication.
    """
    logger.info(f"User {user.sub} listing process instances (key={process_definition_key})")
    client = CamundaClient()
    return await client.get_process_instances(
        process_definition_key=process_definition_key
    )


@app.get(
    "/api/instances/{instance_id}",
    response_model=ProcessInstance,
    tags=["Process Instances"],
)
async def get_instance(
    instance_id: str, user: UserClaims = Depends(verify_clerk_token)
):
    """
    Get a specific process instance.

    Requires authentication.
    """
    logger.info(f"User {user.sub} getting process instance: {instance_id}")
    client = CamundaClient()
    instance = await client.get_process_instance(instance_id)

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Process instance '{instance_id}' not found",
        )

    return instance


@app.get(
    "/api/instances/{instance_id}/variables",
    response_model=Dict[str, Variable],
    tags=["Process Instances"],
)
async def get_instance_variables(
    instance_id: str, user: UserClaims = Depends(verify_clerk_token)
):
    """
    Get variables for a process instance.

    Requires authentication.
    """
    logger.info(f"User {user.sub} getting variables for instance: {instance_id}")
    client = CamundaClient()
    return await client.get_process_instance_variables(instance_id)


# Development/debugging endpoints (optional - remove in production)
@app.get("/api/user", response_model=UserClaims, tags=["Development"])
async def get_current_user(user: UserClaims = Depends(verify_clerk_token)):
    """
    Get current authenticated user information.

    Useful for testing authentication.
    """
    return user


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
