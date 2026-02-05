#!/bin/bash

# PowerManager Diagnostic Script
# Checks USB relay device connectivity and configuration
# Usage: bash diagnose-powermanager.sh

echo "=========================================="
echo "PowerManager Diagnostic Report"
echo "=========================================="
echo ""

# Check 1: Environment Variables
echo "[CHECK 1] PowerManager Environment Configuration"
echo "---"
docker exec lox-audioserver bash -c 'echo "PM_ENABLED: $PM_ENABLED"; echo "PM_USB_PORT: $PM_USB_PORT"; echo "PM_USB_BAUD_RATE: $PM_USB_BAUD_RATE"; echo "PM_CHANNEL: $PM_CHANNEL"; echo "PM_TURN_ON_AT_PLAY: $PM_TURN_ON_AT_PLAY"; echo "PM_TURN_OFF_DELAY: $PM_TURN_OFF_DELAY"'
echo ""
echo ""

# Check 2: USB Devices visible to container
echo "[CHECK 2] USB Devices (lsusb)"
echo "---"
docker exec lox-audioserver lsusb
echo ""
echo ""

# Check 3: Serial devices
echo "[CHECK 3] Serial Device Files (/dev/ttyUSB*)"
echo "---"
docker exec lox-audioserver ls -la /dev/ttyUSB* 2>/dev/null || echo "⚠️ No /dev/ttyUSB devices found - USB relay not mapped"
echo ""
echo ""

# Check 4: Audio devices (ALSA)
echo "[CHECK 4] Audio Playback Devices (aplay -l)"
echo "---"
docker exec lox-audioserver aplay -l
echo ""
echo ""

# Check 5: Audio capture devices (ALSA)
echo "[CHECK 5] Audio Capture Devices (arecord -l)"
echo "---"
docker exec lox-audioserver arecord -l
echo ""
echo ""

# Check 6: Server logs for PowerManager errors
echo "[CHECK 6] PowerManager Initialization Logs"
echo "---"
docker logs lox-audioserver 2>&1 | grep -i "powermanagement\|usbrelay\|pm_enabled" | head -20
echo ""
echo ""

# Check 7: Node SerialPort availability
echo "[CHECK 7] Node.js SerialPort Module Check"
echo "---"
docker exec lox-audioserver bash -c 'node -e "try { const sp = require(\"serialport\"); console.log(\"✓ serialport module loaded successfully\"); console.log(\"Version:\", sp.SerialPort ? \"v7+\" : \"v6\"); } catch(e) { console.error(\"✗ serialport module error:\", e.message); }"'
echo ""
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "1. If /dev/ttyUSB* devices are visible, PowerManager should work"
echo "2. If audio devices are listed, audio config is working"
echo "3. Check Unraid docker-compose.yml devices section is uncommented for Linux"
echo "4. View full logs: docker logs lox-audioserver"
