# AnythingLLM Bad Gateway - DIAGNOSIS & FIX

## Root Cause Identified

The AnythingLLM container (`ab95de32db3b`) is running and healthy, but **has NO port mappings configured**.

### Evidence:
- Container status: `Up 11 minutes (healthy)` ✓
- Container logs show: `Primary server in HTTP mode listening on port 3001` ✓
- Port bindings: `{}` (EMPTY) ✗
- Traefik logs show: `502 Bad Gateway` for `https-natalia_anything-llm-0@file`

The container is listening on port 3001 internally, but there's no way for Traefik (the proxy) to reach it because no ports are exposed.

---

## FIX REQUIRED IN EASYPANEL

You MUST configure the port mapping in the Easypanel web interface. This cannot be fixed via command line.

### Step-by-Step Instructions:

1. **Log into Easypanel**
   - Go to your Easypanel web interface (usually port 3000)

2. **Navigate to the AnythingLLM App**
   - Find the "anything-llm" app in the "natalia" project
   - Click on it to open the app settings

3. **Configure Port Mapping**
   - Go to the **Ports** section
   - Add/Edit the port configuration:
     ```
     Protocol: TCP
     Published: 0 (or leave empty - this lets Easypanel auto-assign)
     Target: 3001
     ```
   - **CRITICAL**: The Target MUST be `3001`

4. **Verify Domain Configuration**
   - Go to the **Domains/Proxy** section
   - Ensure the domain `natalia-anything-llm.x0uyzh.easypanel.host` is attached to THIS app
   - Make sure NO other app has this domain attached
   - There should be NO custom "port" override - it should use the Target port (3001)

5. **Redeploy the App**
   - Click the **Redeploy** button
   - Wait for the container to restart and show "running" status
   - This is CRITICAL - changes won't take effect until you redeploy

6. **Verify the Fix**
   - After redeploy, run: `docker ps | grep anything-llm`
   - You should now see port mappings like: `0.0.0.0:XXXXX->3001/tcp`
   - Test the domain: `curl http://natalia-anything-llm.x0uyzh.easypanel.host`

---

## What to Check in Easypanel (Screenshots Needed)

### Ports Section Should Look Like:
```
Protocol: TCP
Published: 0 (or auto-assigned port)
Target: 3001
```

### Domains/Proxy Section Should Look Like:
```
Domain: natalia-anything-llm.x0uyzh.easypanel.host
App: anything-llm (this app only)
Port: (should be empty/auto - uses Target port)
```

---

## Verification Commands (After Fix)

Run these to confirm the fix worked:

```bash
# Check container has port mappings
docker ps | grep anything-llm

# Should show something like:
# ab95de32db3b   mintplexlabs/anythingllm:latest   ...   0.0.0.0:30123->3001/tcp   natalia_allthing-llm...

# Test the domain
curl -I http://natalia-anything-llm.x0uyzh.easypanel.host

# Should return HTTP 200, not 502
```

---

## Why This Happened

Easypanel manages Docker containers and their port mappings. When you create an app, you need to specify which internal port the container listens on (Target: 3001) and Easypanel will automatically map it to a host port. Without this mapping, the container is isolated and unreachable from outside the Docker network.

The Traefik proxy tries to forward requests to the AnythingLLM container but fails because there's no port to connect to, resulting in 502 Bad Gateway.

---

## Summary

**Problem**: Container running but no port mappings configured
**Solution**: Configure Port mapping in Easypanel (Target: 3001) and Redeploy
**Location**: Easypanel web interface → natalia project → anything-llm app → Ports section

This is a configuration issue in Easypanel, not a code or container issue. The fix must be done through the Easypanel web UI.
