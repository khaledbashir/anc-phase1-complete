#!/bin/bash

# AnythingLLM Diagnostic Script for Easypanel Bad Gateway Issues
# Run this on your VPS that hosts Easypanel

echo "=========================================="
echo "AnythingLLM Diagnostic Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Function to check and print result
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SUCCESS${NC}: $1"
    else
        echo -e "${RED}✗ FAILED${NC}: $1"
    fi
}

# 1. Check Docker container status
print_header "1. Checking Docker Container Status"

echo "Checking for AnythingLLM containers..."
docker ps | grep -i anything-llm
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ AnythingLLM container is running${NC}"
    CONTAINER_ID=$(docker ps | grep -i anything-llm | awk '{print $1}')
    echo "Container ID: $CONTAINER_ID"
    
    echo ""
    echo "Container details:"
    docker inspect $CONTAINER_ID --format='Name: {{.Name}}'
    docker inspect $CONTAINER_ID --format='Status: {{.State.Status}}'
    docker inspect $CONTAINER_ID --format='Ports: {{.NetworkSettings.Ports}}'
else
    echo -e "${RED}✗ No AnythingLLM container found running${NC}"
    echo ""
    echo "Checking all containers (including stopped ones)..."
    docker ps -a | grep -i anything-llm
fi

# 2. Check port 3001 accessibility
print_header "2. Checking Port 3001 Accessibility"

echo "Testing connection to localhost:3001..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --connect-timeout 5 http://127.0.0.1:3001
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Port 3001 is accessible${NC}"
    
    echo ""
    echo "Fetching response headers..."
    curl -I http://127.0.0.1:3001 2>&1 | head -20
    
    echo ""
    echo "Fetching sample response (first 10 lines)..."
    curl -s http://127.0.0.1:3001 2>&1 | head -10
else
    echo -e "${RED}✗ Cannot connect to port 3001${NC}"
    echo ""
    echo "Checking what ports are listening..."
    netstat -tlnp 2>/dev/null | grep :300 || ss -tlnp 2>/dev/null | grep :300
fi

# 3. Check Easypanel services
print_header "3. Checking Easypanel Services"

echo "Checking for Easypanel containers..."
docker ps | grep -i easypanel
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Easypanel is running${NC}"
else
    echo -e "${YELLOW}⚠ Easypanel container not found${NC}"
fi

echo ""
echo "Checking for proxy/reverse proxy containers..."
docker ps | grep -E "(nginx|traefik|caddy|proxy)"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Proxy container found${NC}"
else
    echo -e "${YELLOW}⚠ No proxy container found${NC}"
fi

# 4. Check network connectivity
print_header "4. Checking Network Connectivity"

echo "Testing DNS resolution for the domain..."
DOMAIN="natalia-anything-llm.x0uyzh.easypanel.host"
nslookup $DOMAIN 2>&1 || dig $DOMAIN 2>&1

echo ""
echo "Testing external connectivity to the domain..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --connect-timeout 10 http://$DOMAIN
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Domain is accessible${NC}"
else
    echo -e "${RED}✗ Cannot connect to domain${NC}"
fi

# 5. Check Docker network
print_header "5. Checking Docker Network Configuration"

echo "Listing Docker networks..."
docker network ls

echo ""
echo "Checking AnythingLLM container network settings..."
if [ ! -z "$CONTAINER_ID" ]; then
    docker inspect $CONTAINER_ID --format='Network: {{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
    docker inspect $CONTAINER_ID --format='IP Address: {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
fi

# 6. Check logs
print_header "6. Checking Recent Logs"

if [ ! -z "$CONTAINER_ID" ]; then
    echo "Recent AnythingLLM container logs (last 20 lines):"
    docker logs --tail 20 $CONTAINER_ID 2>&1
else
    echo "No container ID available to check logs"
fi

# 7. Summary and recommendations
print_header "7. Summary and Recommendations"

echo ""
echo "Based on the diagnostic results, here are the next steps:"
echo ""
echo "If port 3001 is NOT accessible locally:"
echo "  1. Check if the container is actually running"
echo "  2. Verify the container is listening on port 3001 (not another port)"
echo "  3. Check container logs for errors"
echo "  4. Ensure the container is not in a crash loop"
echo ""
echo "If port 3001 IS accessible locally but domain shows 502:"
echo "  1. Verify Easypanel port mapping: Target should be 3001"
echo "  2. Check that only one app is bound to the domain"
echo "  3. Redeploy the AnythingLLM app in Easypanel"
echo "  4. Check proxy container logs for errors"
echo "  5. Ensure no SSL/HTTPS mismatch (app should be HTTP on 3001)"
echo ""
echo "To check Easypanel configuration:"
echo "  1. Log into Easypanel web interface"
echo "  2. Go to AnythingLLM app > Ports section"
echo "  3. Verify: Protocol: TCP, Target: 3001"
echo "  4. Go to Domains/Proxy section"
echo "  5. Verify: Domain is attached to this app only"
echo ""
echo "Useful commands for manual investigation:"
echo "  - docker logs <container-id>          # View container logs"
echo "  - docker exec -it <container-id> sh   # Access container shell"
echo "  - docker port <container-id>         # Check port mappings"
echo "  - docker inspect <container-id>      # Full container details"
echo ""

print_header "Diagnostic Complete"
echo "Please share the output of this script along with:"
echo "  - Screenshot of Easypanel Ports section"
echo "  - Screenshot of Easypanel Domains/Proxy section"
echo "  - Result of: curl http://127.0.0.1:3001"
echo ""
