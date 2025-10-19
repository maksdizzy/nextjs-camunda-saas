"""Simple test script to verify proxy functionality."""
import asyncio
import httpx
from datetime import datetime


async def test_health():
    """Test health check endpoint."""
    print("Testing /health endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()


async def test_processes(token: str):
    """Test process definitions endpoint."""
    print("Testing /api/processes endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/api/processes",
            headers={"Authorization": f"Bearer {token}"},
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            processes = response.json()
            print(f"Found {len(processes)} process definitions:")
            for proc in processes[:3]:  # Show first 3
                print(f"  - {proc.get('key')}: {proc.get('name', 'N/A')}")
        else:
            print(f"Error: {response.text}")
        print()


async def test_start_process(token: str, process_key: str):
    """Test starting a process instance."""
    print(f"Testing process start for key: {process_key}...")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://localhost:8000/api/processes/{process_key}/start",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "variables": {
                    "testVariable": "test value",
                    "timestamp": datetime.utcnow().isoformat(),
                },
                "businessKey": f"test-{datetime.utcnow().timestamp()}",
            },
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            instance = response.json()
            print(f"Created instance: {instance.get('id')}")
            return instance.get("id")
        else:
            print(f"Error: {response.text}")
        print()
        return None


async def test_tasks(token: str):
    """Test tasks endpoint."""
    print("Testing /api/tasks endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/api/tasks",
            headers={"Authorization": f"Bearer {token}"},
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            tasks = response.json()
            print(f"Found {len(tasks)} tasks:")
            for task in tasks[:3]:  # Show first 3
                print(f"  - {task.get('id')}: {task.get('name', 'N/A')}")
        else:
            print(f"Error: {response.text}")
        print()


async def main():
    """Run all tests."""
    print("=" * 60)
    print("FastAPI Proxy Test Suite")
    print("=" * 60)
    print()

    # Test health check (no auth required)
    try:
        await test_health()
    except Exception as e:
        print(f"Health check failed: {e}")
        print("Make sure the proxy is running at http://localhost:8000")
        return

    # For authenticated endpoints, you need a real Clerk JWT token
    print("For authenticated endpoint testing, you need a Clerk JWT token.")
    print("Get one from your Next.js frontend or Clerk Dashboard.")
    print()
    token = input("Enter JWT token (or press Enter to skip): ").strip()

    if token:
        try:
            await test_processes(token)
            await test_tasks(token)

            # Optional: test process start if you have a deployed process
            # process_key = input("Enter process key to start (or press Enter to skip): ").strip()
            # if process_key:
            #     await test_start_process(token, process_key)

        except Exception as e:
            print(f"Test failed: {e}")
    else:
        print("Skipping authenticated endpoint tests.")

    print("=" * 60)
    print("Test suite completed")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
