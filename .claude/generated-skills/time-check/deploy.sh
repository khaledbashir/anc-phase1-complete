#!/bin/bash
# Deploy script for time-check AnythingLLM skill

echo "Deploying time-check skill to AnythingLLM..."

# Check if container is running
CONTAINER_NAME="basheer-anything-llm"

if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Error: Container '$CONTAINER_NAME' is not running!"
    echo "Please start AnythingLLM first."
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Copy the skill folder to the container
echo "Copying skill files..."
docker cp "$SCRIPT_DIR" "$CONTAINER_NAME:/app/server/storage/plugins/agent-skills/time-check"

if [ $? -eq 0 ]; then
    echo "✓ Skill deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Refresh AnythingLLM page (exit active chat, reload)"
    echo "2. Go to Agent Settings → Skills"
    echo "3. Find 'Time Check' and toggle it ON"
    echo "4. Test with: 'What time is it?'"
else
    echo "✗ Deployment failed!"
    exit 1
fi
