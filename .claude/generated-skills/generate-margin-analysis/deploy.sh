#!/bin/bash
# Deploy generate-margin-analysis skill to AnythingLLM container
# Run from the server (138.201.126.110)

set -e

SKILL_NAME="generate-margin-analysis"
CONTAINER="basheer-anything-llm"
DEST="/app/server/storage/plugins/agent-skills/${SKILL_NAME}"

echo "🚀 Deploying ${SKILL_NAME} to AnythingLLM..."

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create target directory in container
docker exec "$CONTAINER" mkdir -p "$DEST"

# Copy plugin.json and handler.js
docker cp "${SCRIPT_DIR}/plugin.json" "${CONTAINER}:${DEST}/plugin.json"
docker cp "${SCRIPT_DIR}/handler.js" "${CONTAINER}:${DEST}/handler.js"

echo "✅ Skill deployed to ${DEST}"
echo ""
echo "Next steps:"
echo "  1. Refresh AnythingLLM in your browser"
echo "  2. Go to Agent Settings > Skills"
echo "  3. Find '${SKILL_NAME}' and enable it"
echo "  4. Click the gear icon to set ANC_API_URL if needed"
echo "  5. Start a new agent chat to test"
