#!/bin/bash
# Deploy "Create ANC Proposal" skill to AnythingLLM Docker container
#
# Usage (from the server / VPS):
#   bash deploy.sh
#
# Or from local machine with SSH access:
#   scp -r create-anc-proposal/ root@138.201.126.110:/tmp/
#   ssh root@138.201.126.110 "bash /tmp/create-anc-proposal/deploy.sh"

set -e

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="basheer-anything-llm"  # EasyPanel container name
SKILL_PATH="/app/server/storage/plugins/agent-skills/create-anc-proposal"

echo "=== Deploying 'Create ANC Proposal' to AnythingLLM ==="
echo ""

# Check if docker is available
if ! command -v docker &> /dev/null; then
  echo "ERROR: docker not found. Run this on the VPS (138.201.126.110)."
  exit 1
fi

# Find the actual container (EasyPanel may prefix/suffix the name)
ACTUAL_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "anything-llm" | head -1)
if [ -z "$ACTUAL_CONTAINER" ]; then
  echo "ERROR: No running AnythingLLM container found."
  echo "Available containers:"
  docker ps --format '  {{.Names}}'
  exit 1
fi

echo "Found container: $ACTUAL_CONTAINER"

# Ensure the plugins directory exists
docker exec "$ACTUAL_CONTAINER" mkdir -p /app/server/storage/plugins/agent-skills/

# Remove old version if exists
docker exec "$ACTUAL_CONTAINER" rm -rf "$SKILL_PATH" 2>/dev/null || true

# Copy skill files
docker cp "$SKILL_DIR" "$ACTUAL_CONTAINER:$SKILL_PATH"

echo ""
echo "=== Deployed successfully! ==="
echo ""
echo "Next steps:"
echo "  1. Open AnythingLLM: https://basheer-anything-llm.c9tnyg.easypanel.host"
echo "  2. Go to Settings > Agent Skills"
echo "  3. Find 'Create ANC Proposal' and toggle it ON"
echo "  4. Click the gear icon and set your API_KEY (same as AGENT_SKILL_API_KEY in .env)"
echo "  5. Exit any active agent chats and refresh the page"
echo "  6. Test: @agent Create a budget for Dallas Cowboys with LED Display $84,000"
echo ""
echo "Don't forget to add AGENT_SKILL_API_KEY to your ANC app's .env!"
echo "  Generate one: openssl rand -hex 32"
