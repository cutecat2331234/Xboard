#!/bin/bash
supervisorctl status
curl -sI --max-time 5 http://127.0.0.1:7011 | head -5
curl -sI --max-time 5 http://127.0.0.1:7002 | head -5
ss -tlnp | grep -E '7010|7011' || true
tail -40 /var/log/xboard-octane-new.err.log 2>/dev/null
tail -20 /var/log/xboard-octane-new.log 2>/dev/null
