#!/bin/bash

# Find exact USB device mapping
# Shows which /dev/ttyUSB* corresponds to which physical USB device

echo "=========================================="
echo "USB Device Port Detection"
echo "=========================================="
echo ""

# Method 1: Show all USB devices with detailed info
echo "[METHOD 1] All USB Devices (lsusb -v)"
echo "---"
docker exec lox-audioserver lsusb -v 2>/dev/null | grep -E "Bus |Device |idVendor |idProduct |iProduct |bDeviceClass" | head -40
echo ""
echo ""

# Method 2: Map USB devices to /dev/ttyUSB ports
echo "[METHOD 2] USB Devices → /dev/ttyUSB Mapping"
echo "---"
docker exec lox-audioserver bash << 'EOF'
# Find all /dev/ttyUSB* devices and their corresponding USB info
for tty in /dev/ttyUSB*; do
  if [ -e "$tty" ]; then
    echo "Port: $tty"
    # Find the USB device
    udevadm info --query=all --name="$tty" 2>/dev/null | grep -E "ID_VENDOR|ID_MODEL|ID_SERIAL" | sed 's/^/  /'
    echo ""
  fi
done

if [ ! -e /dev/ttyUSB0 ] && [ ! -e /dev/ttyUSB1 ]; then
  echo "⚠️  No /dev/ttyUSB* devices found!"
  echo "This is normal on Windows - on Linux/Unraid they will appear here"
fi
EOF
echo ""
echo ""

# Method 3: Show kernel device tree (sysfs)
echo "[METHOD 3] Kernel Device Info (sysfs)"
echo "---"
docker exec lox-audioserver bash << 'EOF'
if [ -d /sys/bus/usb/devices ]; then
  for device in /sys/bus/usb/devices/*/; do
    if [ -f "$device/idVendor" ] && [ -f "$device/idProduct" ]; then
      vendor=$(cat "$device/idVendor" 2>/dev/null)
      product=$(cat "$device/idProduct" 2>/dev/null)
      name=$(cat "$device/product" 2>/dev/null)
      echo "Device: $device"
      echo "  Vendor:Product = $vendor:$product"
      echo "  Name: $name"
      
      # Show if this is your relay or audio device
      if [ "$vendor:$product" = "16c0:05df" ]; then
        echo "  ⚡ THIS IS YOUR USB RELAY!"
      fi
      if [ "$vendor:$product" = "0d8c:0102" ]; then
        echo "  🎵 THIS IS YOUR USB AUDIO DEVICE!"
      fi
      echo ""
    fi
  done
else
  echo "sysfs not available in this container"
fi
EOF
echo ""
echo ""

# Method 4: Find which device corresponds to relay by vendor ID
echo "[METHOD 4] Find RelayUSB by Vendor ID (16c0:05df)"
echo "---"
docker exec lox-audioserver bash << 'EOF'
echo "Searching for USB devices with Vendor:Product = 16c0:05df (USBRelay)..."
echo ""

# Try multiple ways to find the device
if command -v lsusb >/dev/null; then
  relay_info=$(lsusb | grep "16c0:05df")
  if [ -n "$relay_info" ]; then
    echo "✓ Found USB Relay:"
    echo "  $relay_info"
    
    # Extract Bus and Device number
    bus=$(echo "$relay_info" | awk '{print $2}')
    device=$(echo "$relay_info" | awk '{print $4}' | cut -d: -f1)
    echo ""
    echo "  Bus: $bus, Device: $device"
    echo "  Path: /sys/bus/usb/devices/${bus}-${device}"
    
    # Try to find the ttyUSB port
    for tty in /dev/ttyUSB*; do
      if [ -e "$tty" ]; then
        tty_info=$(udevadm info --query=all --name="$tty" 2>/dev/null | grep "ID_VENDOR_ID=16c0")
        if [ -n "$tty_info" ]; then
          echo "  Serial Port: $tty"
        fi
      fi
    done
  else
    echo "✗ USB Relay not found - is it plugged in?"
  fi
fi
EOF
echo ""
echo ""

# Method 5: Instructions for identifying the port
echo "[METHOD 5] Manual Identification Steps"
echo "---"
echo "If no /dev/ttyUSB* devices show above, follow these steps on Unraid:"
echo ""
echo "1. Open terminal/SSH to Unraid:"
echo "   ssh root@unraid-ip"
echo ""
echo "2. List all USB devices:"
echo "   lsusb"
echo ""
echo "3. Check serial devices:"
echo "   ls -la /dev/ttyUSB*"
echo ""
echo "4. If Relay shows USB ID 16c0:05df, find its port:"
echo "   udevadm info --query=path --name=/dev/ttyUSB0 | grep -i 16c0"
echo ""
echo "5. Or disconnect relay and check dmesg:"
echo "   dmesg | tail"
echo "   (shows which /dev/ttyUSB* was disconnected)"
echo ""
echo "6. Reconnect and run:"
echo "   dmesg | tail"
echo "   (shows which /dev/ttyUSB* was connected)"
echo ""
echo "=========================================="
echo "Report Complete"
echo "=========================================="
