#!/bin/bash
# entrypoint.sh - Initialize audio and other kernel modules, then start the app

set -e

echo "[entrypoint] Starting Audio2Lox Server..."

# Load kernel audio modules for USB devices (if privileged)
if [ -w /sys/module ]; then
    echo "[entrypoint] Loading audio kernel modules..."
    
    # Load ALSA/SND modules for USB audio support
    modprobe -v snd_usb_audio 2>&1 || echo "[entrypoint] Warning: snd_usb_audio failed (may already be loaded)"
    modprobe -v snd_usbmidi_ep0 2>&1 || true
    
    # Wait a moment for devices to appear
    sleep 1
    
    # Verify audio subsystem
    if [ -f /proc/asound/cards ]; then
        echo "[entrypoint] ✓ ALSA soundcards detected:"
        cat /proc/asound/cards
    else
        echo "[entrypoint] ⚠ Warning: No ALSA soundcards found yet"
    fi
else
    echo "[entrypoint] ⚠ Warning: Not running privileged - cannot load kernel modules"
    echo "[entrypoint]   Audio may not work unless run with: privileged: true or cap_add: [SYS_MODULE]"
fi

# Set correct permissions for audio devices
if [ -d /dev/snd ]; then
    echo "[entrypoint] Setting audio device permissions..."
    chmod 666 /dev/snd/* 2>/dev/null || true
fi

# Display USB devices (for debugging)
echo "[entrypoint] USB devices present:"
lsusb 2>/dev/null | grep -E "16c0:05df|0d8c:0102" || echo "[entrypoint] (No recognized devices found)"

# Start the application
echo "[entrypoint] Starting Node.js application..."
exec "$@"
