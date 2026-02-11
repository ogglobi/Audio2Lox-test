#!/bin/bash
# entrypoint.sh - Start Snapcast Server and Audio2Lox application

set -e

echo "[entrypoint] Starting Audio2Lox with Snapcast Server..."

# Start Snapcast Server in background (multiroom audio routing)
if command -v snapserver &> /dev/null; then
    echo "[entrypoint] Starting Snapcast Server (port 1704)..."
    snapserver --daemonize || echo "[entrypoint] Warning: snapserver may need /etc/snapserver.conf"
    sleep 2
    echo "[entrypoint] ✓ Snapcast Server initialized"
else
    echo "[entrypoint] ⚠ WARNING: snapserver NOT FOUND - audio will not work!"
fi

# USB device permissions for Relay
if [ -d /dev/bus/usb ]; then
    chmod 666 /dev/bus/usb* 2>/dev/null || true
fi

echo "[entrypoint] Starting Node.js Audio2Lox application..."
exec "$@"
