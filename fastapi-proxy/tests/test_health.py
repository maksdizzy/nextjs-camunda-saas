"""Tests for health check endpoint."""
import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_health_endpoint_exists(client):
    """Test that health endpoint exists and returns 200."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_structure(client):
    """Test health response has correct structure."""
    response = client.get("/health")
    data = response.json()

    assert "status" in data
    assert "timestamp" in data
    assert "engine_url" in data
    assert "engine_reachable" in data


def test_health_no_auth_required(client):
    """Test that health endpoint doesn't require authentication."""
    # Should work without Authorization header
    response = client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_async():
    """Test health endpoint with async client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["engine_url"] is not None
