#!/bin/bash

# Test-Script für Audio Configuration API
# Verwendung: bash test-audio-api.sh [hostname] [port]

HOST="${1:-localhost}"
PORT="${2:-7090}"
BASE_URL="http://${HOST}:${PORT}/admin/api"

echo "=========================================="
echo "Audio Configuration API Tests"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Audio Devices
echo "[TEST 1] Audio Devices"
echo "GET $BASE_URL/audio/devices"
echo "---"
curl -s "$BASE_URL/audio/devices" | jq '.' || curl -s "$BASE_URL/audio/devices"
echo ""
echo ""

# Test 2: Squeezelite Players
echo "[TEST 2] Squeezelite Players"
echo "GET $BASE_URL/audio/squeezelite/players"
echo "---"
curl -s "$BASE_URL/audio/squeezelite/players" | jq '.' || curl -s "$BASE_URL/audio/squeezelite/players"
echo ""
echo ""

# Test 3: PowerManager Status
echo "[TEST 3] PowerManager Status"
echo "GET $BASE_URL/powermanager/status"
echo "---"
curl -s "$BASE_URL/powermanager/status" | jq '.' || curl -s "$BASE_URL/powermanager/status"
echo ""
echo ""

# Test 4: PowerManager Ports
echo "[TEST 4] PowerManager Ports"
echo "GET $BASE_URL/powermanager/ports"
echo "---"
curl -s "$BASE_URL/powermanager/ports" | jq '.' || curl -s "$BASE_URL/powermanager/ports"
echo ""
echo ""

# Test 5: Check USB Devices in container
echo "[TEST 5] Container USB Devices"
echo "Command: lsusb"
echo "---"
docker exec lox-audioserver lsusb
echo ""
echo ""

# Test 6: Check ALSA Audio Devices
echo "[TEST 6] Container Audio Devices (aplay)"
echo "Command: aplay -l"
echo "---"
docker exec lox-audioserver aplay -l
echo ""
echo ""

# Test 7: Check ttyUSB devices
echo "[TEST 7] Container Serial Devices"
echo "Command: ls -la /dev/ttyUSB*"
echo "---"
docker exec lox-audioserver ls -la /dev/ttyUSB* 2>/dev/null || echo "No /dev/ttyUSB devices found"
echo ""
echo ""

echo "=========================================="
echo "Tests Complete"
echo "=========================================="
