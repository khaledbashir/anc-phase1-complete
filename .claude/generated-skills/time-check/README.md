# Time Check — AnythingLLM Custom Agent Skill

A simple AnythingLLM agent skill that returns the current date and time, with optional timezone support.

## Features

- Returns current date/time
- Supports any IANA timezone (e.g., America/New_York, Europe/London, Asia/Tokyo)
- Shows server local time as reference
- Includes UTC time for comparison

## Installation

### Option 1: Copy via Docker (from your server)

```bash
docker cp /root/rag2/.claude/generated-skills/time-check basheer-anything-llm:/app/server/storage/plugins/agent-skills/
```

### Option 2: Copy via EasyPanel terminal

1. Go to EasyPanel → basheer/anything-llm → Terminal
2. Navigate to skills folder:
   ```bash
   cd /app/server/storage/plugins/agent-skills/
   ```
3. Create the folder and files manually (copy content from plugin.json and handler.js)

### Option 3: Use the deploy script

```bash
cd /root/rag2/.claude/generated-skills/time-check
chmod +x deploy.sh
./deploy.sh
```

## After Installation

1. **Refresh AnythingLLM** — Exit any active agent chat, reload the browser page
2. **Enable the skill** — Go to Agent Settings → Skills → Find "Time Check" → Toggle ON
3. **Test it** — Start a new agent chat and try:
   - "What time is it?"
   - "What's the time in New York?"
   - "Current time in Tokyo?"

## Usage Examples

| User Prompt | What It Does |
|-------------|--------------|
| "What time is it?" | Returns server local time |
| "What time is it in London?" | Returns current time in Europe/London |
| "Time in Tokyo" | Returns current time in Asia/Tokyo |
| "UTC time please" | Returns current UTC time |

## Timezone Format

Use IANA timezone identifiers:
- `UTC` — Coordinated Universal Time
- `America/New_York` — Eastern Time
- `America/Chicago` — Central Time
- `America/Denver` — Mountain Time
- `America/Los_Angeles` — Pacific Time
- `Europe/London` — UK time
- `Europe/Paris` — Central European Time
- `Asia/Tokyo` — Japan time
- `Australia/Sydney` — Sydney time

Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

## Troubleshooting

**Skill not appearing:**
- Make sure folder name matches `hubId` in plugin.json: `time-check`
- Refresh AnythingLLM page after copying
- Check Agent Settings → Skills

**Error "Invalid timezone":**
- Use full IANA timezone names (e.g., `America/New_York`, not `EST`)
- Check the timezone list link above

## Version

1.0.0 — Initial release
