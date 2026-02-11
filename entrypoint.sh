#!/bin/bash
# entrypoint.sh - All-in-One Snapcast Audio System
# Starts: Snapserver (audio router) → Snapclient (USB audio out) → Node.js app

set -e

echo "[entrypoint] Starting Audio2Lox All-in-One Audio Container..."

# Verify USB audio device exists
if [ -d /dev/snd ]; then
    echo "[entrypoint] ✓ ALSA audio devices available"
    ls -la /dev/snd 2>/dev/null | grep -E "pcm|control" || echo "[entrypoint] ⚠ No PCM devices yet"
else
    echo "[entrypoint] ⚠ WARNING: /dev/snd not available - audio will fail!"
fi

# Start Snapcast Server (must be first - listens on 1704)
if command -v snapserver &> /dev/null; then
    echo "[entrypoint] 1. Starting Snapcast Server (internal audio router)..."
    snapserver --daemonize 2>&1 || true
    sleep 2
    echo "[entrypoint]    ✓ Snapserver ready on :1704"
else
    echo "[entrypoint] ✗ ERROR: snapserver NOT FOUND!"
    exit 1
fi

# Wait for snapserver to fully initialize
sleep 1

# Start Snapcast Client (connects to local Snapserver, outputs to USB audio)
if command -v snapclient &> /dev/null; then
    echo "[entrypoint] 2. Starting Snapcast Client (USB audio output)..."
    # Connect to localhost snapserver, output to ALSA device (default = first USB audio)
    snapclient -h localhost -p 1704 --soundcard default --daemon 2>&1 || echo "[entrypoint] ⚠ snapclient config issue"
    sleep 2
    echo "[entrypoint]    ✓ Snapclient connected to USB audio"
else
    echo "[entrypoint] ⚠ WARNING: snapclient NOT FOUND - audio output disabled!"
fi

# USB Relay permissions
if [ -d /dev/bus/usb ]; then
    chmod 666 /dev/bus/usb* 2>/dev/null || true
fi

echo "[entrypoint] ✓ Snapcast audio system ready"
echo "[entrypoint] 3. Starting Node.js Audio2Lox application..."
exec "$@"
