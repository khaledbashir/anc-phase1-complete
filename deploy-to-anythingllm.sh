#!/bin/bash

# Master deployment script for AnythingLLM skills

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AnythingLLM Skill Deployment Tool${NC}"
echo ""

# Function to find AnythingLLM container
find_container() {
    # First try the known container name
    if docker ps | grep -q "basheer_anything-llm.1.nofw02yss38mc4kahdra7jt5b"; then
        echo "basheer_anything-llm.1.nofw02yss38mc4kahdra7jt5b"
        return
    fi

    # Try to find any AnythingLLM container
    local container=$(docker ps --format "table {{.Names}}" | grep -i anything-llm | head -1)
    if [ -n "$container" ]; then
        echo "$container"
        return
    fi

    # No container found
    echo ""
}

# Check if skill path is provided
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Usage: $0 <skill-folder-path>${NC}"
    echo "Example: $0 .claude/generated-skills/my-skill"
    echo ""
    echo "Available skills to deploy:"
    if [ -d ".claude/generated-skills" ]; then
        ls -1 .claude/generated-skills/ 2>/dev/null | sed 's/^/  - /'
    fi
    exit 1
fi

SKILL_PATH="$1"
SKILL_NAME=$(basename "$SKILL_PATH")

# Validate skill path
if [ ! -d "$SKILL_PATH" ]; then
    echo -e "${RED}❌ Skill folder not found: $SKILL_PATH${NC}"
    exit 1
fi

# Check required files
if [ ! -f "$SKILL_PATH/plugin.json" ]; then
    echo -e "${RED}❌ plugin.json not found in $SKILL_PATH${NC}"
    exit 1
fi

if [ ! -f "$SKILL_PATH/handler.js" ]; then
    echo -e "${RED}❌ handler.js not found in $SKILL_PATH${NC}"
    exit 1
fi

# Find container
echo "🔍 Finding AnythingLLM container..."
CONTAINER=$(find_container)

if [ -z "$CONTAINER" ]; then
    echo -e "${RED}❌ No AnythingLLM container found running${NC}"
    echo "Please make sure AnythingLLM is running in Docker"
    exit 1
fi

echo -e "${GREEN}✅ Found container: $CONTAINER${NC}"

# Deploy skill
CONTAINER_SKILL_PATH="/app/server/storage/plugins/agent-skills/$SKILL_NAME"

echo "📦 Deploying skill: $SKILL_NAME"

# Create directory in container
docker exec "$CONTAINER" mkdir -p "$CONTAINER_SKILL_PATH"

# Copy files
echo "  📄 Copying plugin.json..."
docker cp "$SKILL_PATH/plugin.json" "$CONTAINER:$CONTAINER_SKILL_PATH/"

echo "  📄 Copying handler.js..."
docker cp "$SKILL_PATH/handler.js" "$CONTAINER:$CONTAINER_SKILL_PATH/"

# Copy README if exists
if [ -f "$SKILL_PATH/README.md" ]; then
    echo "  📄 Copying README.md..."
    docker cp "$SKILL_PATH/README.md" "$CONTAINER:$CONTAINER_SKILL_PATH/"
fi

# Verify deployment
if docker exec "$CONTAINER" test -f "$CONTAINER_SKILL_PATH/plugin.json"; then
    echo -e "${GREEN}✅ Skill deployed successfully!${NC}"
    echo ""

    # Parse skill info from plugin.json
    SKILL_DISPLAY_NAME=$(grep '"name"' "$SKILL_PATH/plugin.json" | cut -d'"' -f4)

    echo "📋 Next steps:"
    echo "  1. Reload your AnythingLLM interface (exit agent chat + refresh)"
    echo "  2. Go to Agent Settings > Skills"
    echo "  3. Find and enable: $SKILL_DISPLAY_NAME"
    echo "  4. Configure any setup arguments (click gear icon)"
    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
else
    echo -e "${RED}❌ Deployment verification failed${NC}"
    exit 1
fi