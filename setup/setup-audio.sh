#!/bin/bash
# =============================================================================
# Audio2Lox Setup: ALSA Virtual Devices + Multi-Snapclient
# =============================================================================
# Installs ALSA config and starts multiple Snapclient instances,
# one per stereo output pair of the USB 7.1 sound card.
#
# Usage: bash setup-audio.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIO2LOX_DIR="/opt/audio2lox"
SNAPSERVER_HOST="127.0.0.1"
SNAPSERVER_PORT="1704"

echo "=== Audio2Lox Audio Setup ==="

# --- Step 1: Install ALSA config ---
echo ""
echo "[1/3] Installing ALSA virtual device config..."
if [ -f /etc/asound.conf ]; then
    cp /etc/asound.conf /etc/asound.conf.bak
    echo "  Backed up existing /etc/asound.conf → /etc/asound.conf.bak"
fi
cp "$SCRIPT_DIR/asound.conf" /etc/asound.conf
echo "  Installed /etc/asound.conf"

# --- Step 2: Verify ALSA devices ---
echo ""
echo "[2/3] Verifying ALSA virtual devices..."
echo "  Mono channels:"
for i in 0 1 2 3 4 5 6 7; do
    dev="usb_ch${i}"
    if aplay -D "$dev" /dev/zero -d 0 -f S16_LE -r 48000 -c 1 2>/dev/null; then
        echo "    ✓ $dev"
    else
        echo "    ✗ $dev"
    fi
done
echo "  Stereo pairs:"
for dev in usb_stereo01 usb_stereo23 usb_stereo45 usb_stereo67 onboard; do
    if aplay -D "$dev" /dev/zero -d 0 -f S16_LE -r 48000 -c 2 2>/dev/null; then
        echo "    ✓ $dev"
    else
        echo "    ✗ $dev"
    fi
done

# --- Step 3: Install systemd services for Snapclients ---
echo ""
echo "[3/3] Creating Snapclient systemd services..."
echo ""
echo "  Which outputs do you want to activate?"
echo "  Edit the CLIENTS array in this script to match your room layout."
echo ""

# ===========================================================================
# CONFIGURE YOUR ROOMS HERE
# Format: NAME:ALSA_DEVICE:CLIENT_ID
#
# ALSA_DEVICE options:
#   Mono:   usb_ch0, usb_ch1, ..., usb_ch7  (single speaker)
#   Stereo: usb_stereo01, usb_stereo23, usb_stereo45, usb_stereo67
#   Onboard: onboard (ALC1220 Analog)
# ===========================================================================
CLIENTS=(
    "wohnzimmer:usb_stereo01:audio2lox-wohnzimmer"
    "kueche:usb_ch2:audio2lox-kueche"
    "schlafzimmer:usb_ch3:audio2lox-schlafzimmer"
    "bad:usb_ch4:audio2lox-bad"
    "buero:onboard:audio2lox-buero"
)

for entry in "${CLIENTS[@]}"; do
    IFS=':' read -r name alsa_dev client_id <<< "$entry"
    SERVICE="snapclient-${name}"
    
    cat > "/etc/systemd/system/${SERVICE}.service" << EOF
[Unit]
Description=Snapclient ${name} (ALSA: ${alsa_dev})
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/snapclient \\
    --host ${SNAPSERVER_HOST} \\
    --port ${SNAPSERVER_PORT} \\
    --soundcard ${alsa_dev} \\
    --hostID ${client_id} \\
    --player alsa \\
    --logsink system
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${SERVICE}.service"
    echo "  ✓ ${SERVICE}.service created (ALSA: ${alsa_dev}, ID: ${client_id})"
done

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Available ALSA virtual devices:"
echo ""
echo "  MONO (single speaker per room):"  
echo "    usb_ch0   → USB Ch 0 (Front Left)"
echo "    usb_ch1   → USB Ch 1 (Front Right)"
echo "    usb_ch2   → USB Ch 2 (Rear Left)"
echo "    usb_ch3   → USB Ch 3 (Rear Right)"
echo "    usb_ch4   → USB Ch 4 (Center)"
echo "    usb_ch5   → USB Ch 5 (LFE/Sub)"
echo "    usb_ch6   → USB Ch 6 (Side Left)"
echo "    usb_ch7   → USB Ch 7 (Side Right)"
echo ""
echo "  STEREO (speaker pair per room):"
echo "    usb_stereo01  → USB Ch 0+1 (Front L/R)"
echo "    usb_stereo23  → USB Ch 2+3 (Rear L/R)"
echo "    usb_stereo45  → USB Ch 4+5 (Center/LFE)"
echo "    usb_stereo67  → USB Ch 6+7 (Side L/R)"
echo ""
echo "  ONBOARD:"
echo "    onboard  → ALC1220 Analog (hw:0,0)"
echo ""
echo "Configured Snapclient instances:"
for entry in "\${CLIENTS[@]}"; do
    IFS=':' read -r name alsa_dev client_id <<< "\$entry"
    echo "    \$client_id  →  \$alsa_dev  (\$name)"
done
echo ""
echo "To start all:    systemctl start snapclient-*"
echo "To stop all:     systemctl stop snapclient-*"
echo "To check status: systemctl status 'snapclient-*'"
echo ""
echo "Then in Audio2Lox GUI → Zone Mapping:"
echo "  1. Select 'Snapcast' as output type"
echo "  2. Enter the Client ID (e.g. audio2lox-wohnzimmer)"
echo "  3. Save & restart server"
