#!/bin/bash

# VPS Health Check & Docker Cleanup Script
# Run this script on your VPS to check system health and clean up Docker resources
# Usage: chmod +x vps-health-docker-cleanup.sh && ./vps-health-docker-cleanup.sh

echo "=========================================="
echo "VPS Health Check & Docker Cleanup Script"
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

# 1. System Health Check
print_header "1. System Health Check"

echo "System Information:"
uname -a
echo ""

echo "Load Average (1, 5, 15 minutes):"
uptime
echo ""

echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo ""

echo "Memory Usage:"
free -h
echo ""

echo "Disk Usage:"
df -h
echo ""

# 2. Docker System Cleanup
print_header "2. Docker System Cleanup"

echo "Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker is installed${NC}"
    
    echo ""
    echo "Cleaning up Docker resources..."
    
    echo "1. Removing stopped containers..."
    docker container prune -f
    check_result "Container prune completed"
    
    echo "2. Removing unused images..."
    docker image prune -f
    check_result "Image prune completed"
    
    echo "3. Removing unused volumes..."
    docker volume prune -f
    check_result "Volume prune completed"
    
    echo "4. Removing unused networks..."
    docker network prune -f
    check_result "Network prune completed"
    
    echo "5. Removing build cache..."
    docker builder prune -f
    check_result "Build cache prune completed"
    
    echo ""
    echo "Docker system df after cleanup:"
    docker system df
    
else
    echo -e "${RED}✗ Docker is not installed${NC}"
fi

# 3. Docker Container Status
print_header "3. Docker Container Status"

if command -v docker &> /dev/null; then
    echo "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "All containers (including stopped):"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
else
    echo "Docker not installed - skipping container status check"
fi

# 4. Log Cleanup
print_header "4. Log Cleanup"

echo "Checking Docker log file sizes..."
if command -v docker &> /dev/null; then
    LOG_SIZE=$(docker system df --format '{{.LogSize}}')
    if [ -n "$LOG_SIZE" ]; then
        echo "Docker log size: $LOG_SIZE"
    fi
fi

# 5. Security Updates
print_header "5. Security Updates Check"

echo "Checking for available security updates..."
if command -v apt-get &> /dev/null; then
    echo "Updating package lists..."
    apt-get update -qq > /dev/null
    echo "Checking for upgrades..."
    UPGRADES=$(apt list --upgradable 2>/dev/null | grep -v "Listing..." | wc -l)
    if [ $UPGRADES -eq 0 ]; then
        echo -e "${GREEN}✓ System is up to date${NC}"
    else
        echo -e "${YELLOW}⚠ $UPGRADES security updates available${NC}"
        echo "Run 'apt-get upgrade -y' to install updates"
    fi
elif command -v yum &> /dev/null; then
    echo "Checking for updates..."
    yum check-update -q > /dev/null
    UPGRADES=$(yum check-update 2>/dev/null | grep -v "Loading mirror speeds from cached hostfile" | wc -l)
    if [ $UPGRADES -eq 0 ]; then
        echo -e "${GREEN}✓ System is up to date${NC}"
    else
        echo -e "${YELLOW}⚠ $UPGRADES security updates available${NC}"
        echo "Run 'yum update -y' to install updates"
    fi
else
    echo "Package manager not recognized - skipping updates check"
fi

# 6. Summary
print_header "6. Summary"

echo ""
echo "Based on the health check, here are the recommendations:"
echo ""

echo "1. If disk usage is above 80%:"
echo "   - Check for large files with: find / -type f -size +100M 2>/dev/null"
echo "   - Clean up old log files in /var/log"
echo "   - Remove unused Docker images and containers"
echo ""

echo "2. If memory usage is high:"
echo "   - Check running processes with: top"
echo "   - Look for memory leaks in applications"
echo "   - Consider upgrading your VPS plan"
echo ""

echo "3. If CPU load is high:"
echo "   - Check running processes with: top"
echo "   - Identify the process consuming CPU"
echo "   - Optimize or restart the problematic service"
echo ""

echo "4. For Docker performance:"
echo "   - Regularly run this script to clean up unused resources"
echo "   - Monitor container logs for errors"
echo "   - Consider using Docker healthchecks"
echo ""

print_header "Health Check & Cleanup Complete"
echo "Run this script periodically to maintain optimal VPS performance"