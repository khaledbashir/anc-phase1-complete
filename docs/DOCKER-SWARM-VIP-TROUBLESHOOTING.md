# Docker Swarm VIP Routing Failure — Troubleshooting Guide

## Problem Summary

**Symptom**: 502 Bad Gateway errors from Traefik even when services are healthy
**Root Cause**: Docker Swarm VIP (Virtual IP) routing mesh completely broken — VIP exists but doesn't forward traffic to actual containers
**Impact**: Affects all services using default VIP endpoint mode

## ⚠️ CRITICAL: EasyPanel Resets Services to VIP Mode

**IMPORTANT**: Every time EasyPanel redeploys a service, it resets the endpoint mode back to VIP (broken state).

**Quick Fix** (run after ANY EasyPanel deployment):
```bash
/root/fix-vip.sh
```

This script automatically detects and fixes all services in VIP mode. Add it to your deployment workflow or run it whenever you see 502 errors after a deploy.

## When to Suspect This Issue

You're experiencing this Docker Swarm VIP routing failure if you see:

1. ✅ **Service is healthy** (health checks pass inside container)
2. ✅ **DNS resolves correctly** (service name → IP works)
3. ❌ **Connection to service VIP times out** (no route to host)
4. ❌ **502 Bad Gateway from Traefik** (reverse proxy can't reach service)
5. ✅ **Direct container IP works** (bypassing VIP succeeds)

## Diagnostic Steps

### Step 1: Verify Service Health

```bash
# Check service status
docker service ls | grep <service-name>

# Check container logs
docker service logs <service-name> --tail 50

# If app has health endpoint, test it from inside container
docker exec $(docker ps -qf name=<service-name>) curl -s localhost:<port>/health
```

**Expected**: Service shows healthy, logs are normal, health endpoint returns 200.

### Step 2: Test DNS Resolution

```bash
# Resolve service name to IP (from host or another container)
docker exec $(docker ps -qf name=<service-name>) nslookup <service-name>

# Check what IP it resolves to
docker service inspect <service-name> --format '{{.Endpoint.VirtualIPs}}'
```

**Expected**: DNS resolves, but the VIP won't be routable.

### Step 3: Test VIP Connectivity (The Smoking Gun)

```bash
# Test connection to service via its service name (uses VIP)
docker exec $(docker ps -qf name=<another-service>) nc -zv <broken-service-name> <port>
```

**Broken VIP Behavior**:
- `nc: connect to <service> port <port> (tcp) failed: No route to host`
- OR: Connection hangs/times out

**Working VIP Behavior**:
- `Connection to <service> <port> port [tcp] succeeded!`

### Step 4: Check Endpoint Mode

```bash
# Check if service uses VIP or dnsrr
docker service inspect <service-name> --format '{{.Endpoint.Spec.Mode}}'
```

- **`vip`** = Virtual IP (broken routing mesh)
- **`dnsrr`** = DNS round-robin (direct container IPs)

## The Fix: Switch to DNS Round-Robin (dnsrr)

### Apply the Fix

```bash
# Switch service from VIP to dnsrr mode
docker service update --endpoint-mode dnsrr <service-name>

# Wait for convergence
# Output: "verify: Service <service-name> converged"
```

### Verify the Fix

```bash
# Confirm endpoint mode changed
docker service inspect <service-name> --format '{{.Endpoint.Spec.Mode}}'
# Should return: dnsrr

# Test connectivity again
docker exec $(docker ps -qf name=<another-service>) nc -zv <service-name> <port>
# Should succeed now

# Test external URL (if using Traefik reverse proxy)
curl -I https://<service-domain>.prd42b.easypanel.host
# Should return 200 or service-specific response (not 502)
```

## What This Fix Does

### VIP Mode (Default, Broken)
- Docker creates a Virtual IP (e.g., `10.11.4.0`)
- All traffic to service name goes through this VIP
- VIP supposed to route to actual containers via routing mesh
- **Problem**: Routing mesh broken — VIP exists but traffic dies

### dnsrr Mode (Fix, Working)
- DNS returns actual container IPs (e.g., `10.11.3.247`)
- Traffic goes directly to containers, bypassing VIP
- No routing mesh required
- **Result**: Direct routing, problem bypassed

## Services We Fixed

During the 2026-02-14 incident, we applied this fix to:

1. **basheer_therag2** (main app)
   - Symptom: 502 Bad Gateway
   - Fix: `docker service update --endpoint-mode dnsrr basheer_therag2`
   - Result: App came online immediately

2. **basheer_browserless** (PDF generation)
   - Symptom: PDF generation failing, app falling back to local Chromium
   - Fix: `docker service update --endpoint-mode dnsrr basheer_browserless`
   - Result: Puppeteer connectivity restored

3. **basheer_jsreport** (alternate PDF service)
   - Symptom: jsreport API returning 502
   - Fix: `docker service update --endpoint-mode dnsrr basheer_jsreport`
   - Result: Service reachable

## Common Mistakes to Avoid

### ❌ Don't Do This

1. **Don't restart services without diagnosing first**
   - Restarting a service in VIP mode just assigns a new (equally broken) VIP
   - Wastes time and doesn't fix the root cause

2. **Don't restart Traefik**
   - Traefik is fine — it's the Docker Swarm routing mesh that's broken
   - Restarting Traefik won't fix VIP routing

3. **Don't remove/re-add networks**
   - Network connectivity is fine
   - Problem is VIP routing layer, not network layer

4. **Don't force service updates**
   - `docker service update --force` doesn't change endpoint mode
   - Just redeploys with same broken VIP mode

### ✅ Do This Instead

1. **Test VIP connectivity first** (`nc -zv <service> <port>`)
2. **Apply dnsrr fix immediately** if VIP routing fails
3. **Document which services were fixed** (in case you need to reapply)

## Preventive Measures

### For New Services

When deploying new services on this Docker Swarm, **use dnsrr by default**:

```bash
docker service create \
  --endpoint-mode dnsrr \
  --name <service-name> \
  <image>
```

### For EasyPanel Deployments

EasyPanel deploys services with VIP mode by default. After EasyPanel creates a service:

```bash
# List all services
docker service ls

# Fix any new services showing issues
docker service update --endpoint-mode dnsrr <service-name>
```

## Why This Happens

**Root Cause**: Docker Swarm routing mesh failure at the VIP layer.

This is likely due to:
- VPS network configuration incompatibility with Docker Swarm overlay networks
- Kernel or iptables rules interfering with IPVS routing
- Docker Swarm version-specific bug with this infrastructure

**Why dnsrr works**: It bypasses the broken routing mesh entirely by using direct container IPs.

## Quick Reference: One-Line Fix

```bash
# Diagnose
docker exec $(docker ps -qf name=<any-container>) nc -zv <broken-service> <port>

# Fix if "No route to host"
docker service update --endpoint-mode dnsrr <broken-service>

# Verify
curl -I https://<service-domain>.prd42b.easypanel.host
```

## Related Issues

- Database connection errors (P1001: Can't reach database server) → Same VIP routing issue
- Service discovery failures between containers → Same VIP routing issue
- Traefik 502 despite healthy services → Same VIP routing issue

**Solution for all**: Apply dnsrr endpoint mode.

---

**Last Updated**: 2026-02-14
**Incident**: 502 Bad Gateway across all services
**Resolution**: Switched all services from VIP to dnsrr endpoint mode
**Status**: All services operational
