#!/bin/bash
# Development startup script for FastAPI proxy

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Clerk-Camunda Proxy Startup ===${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo -e "${RED}Please edit .env with your configuration before running again${NC}"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
source venv/bin/activate

# Install/update dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check if Camunda Engine is reachable
ENGINE_URL=$(grep ENGINE_URL .env | cut -d '=' -f2)
echo -e "${BLUE}Checking Camunda Engine at ${ENGINE_URL}...${NC}"
if curl -s -f -u demo:demo "${ENGINE_URL}/version" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Camunda Engine is reachable${NC}"
else
    echo -e "${RED}⚠ Warning: Cannot reach Camunda Engine at ${ENGINE_URL}${NC}"
    echo -e "${RED}  Make sure the engine is running before testing the proxy${NC}"
fi

# Start the server
echo -e "${GREEN}Starting FastAPI server...${NC}"
echo -e "${BLUE}API will be available at: http://localhost:8000${NC}"
echo -e "${BLUE}API docs available at: http://localhost:8000/docs${NC}"
echo ""

# Run with auto-reload in development mode
uvicorn main:app --reload --host 0.0.0.0 --port 8000
