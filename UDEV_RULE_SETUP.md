# udev-Rule Setup für USBRelay2

## Was das macht

Die udev-Rule erstellt einen **Symlink** für das USBRelay2 HID-Gerät, damit es wie ein serielles Gerät (`/dev/ttyUSB_RELAY`) angesprochen werden kann.

**Resultat:**
- dein Relais wird erkannt als `/dev/hidraw3` (HID-Gerät)
- aber auch als `/dev/ttyUSB_RELAY` (Symlink) verfügbar
- PowerManager kann damit arbeiten!

## Installation auf Unraid

### Schritt 1: udev-Rule datei kopieren

```bash
# SSH auf Unraid
ssh root@unraid-ip

# udev-Rules sind in /etc/udev/rules.d/
# Kopiere die Rule-Datei dorthin:

scp 99-usbrelay.rules root@unraid-ip:/etc/udev/rules.d/
```

Oder manuell:
```bash
# Auf Unraid Terminal:
cat > /etc/udev/rules.d/99-usbrelay.rules << 'EOF'
# udev Rule für USBRelay2 (16c0:05df)
SUBSYSTEMS=="usb", ATTRS{idVendor}=="16c0", ATTRS{idProduct}=="05df", SYMLINK+="ttyUSB_RELAY"
EOF
```

### Schritt 2: udev neuladen

```bash
# Auf Unraid:
udevadm control --reload-rules
udevadm trigger
```

### Schritt 3: Relais ausstecken/einstecken

Relais aus- und wieder einstecken, damit udev die neue Rule anwendet.

### Schritt 4: Überprüfen

```bash
# Sollte jetzt beide zeigen:
ls -la /dev/ttyUSB_RELAY
ls -la /dev/hidraw*

# Test ob Relais erkannt wird:
lsusb | grep 16c0:05df
```

## docker-compose.yml anpassen

Nachdem die udev-Rule aktiv ist, update docker-compose.yml:

```yaml
services:
  loxoneaudioserver:
    ...
    devices:
      - /dev/snd:/dev/snd                 # Audio-Soundkarte
      - /dev/ttyUSB_RELAY:/dev/ttyUSB0    # Relais HID → /dev/ttyUSB0 im Container
    
    environment:
      PM_ENABLED: "true"
      PM_USB_PORT: "/dev/ttyUSB0"         # Das ist jetzt das Relais!
      PM_USB_BAUD_RATE: "9600"
      PM_CHANNEL: "1"
      PM_TURN_ON_AT_PLAY: "true"
      PM_TURN_OFF_DELAY: "5"
```

## Problembehebung

### Problem: `/dev/ttyUSB_RELAY` existiert nicht

**Ursache:** udev-Rule wurde nicht neu geladen oder Relais ist nicht angesteckt

**Lösung:**
```bash
# 1. Rules neu laden
sudo udevadm control --reload-rules
sudo udevadm trigger

# 2. Relais aus-/einstecken
# (oder USB-Hub kurz vom Strom trennen)

# 3. Überprüfen ob Regel aktiv ist:
udevadm test /devices/pci*/*/usb*/*/ 2>&1 | grep 16c0

# 4. Wenn immer noch nicht funktioniert, logs checken:
journalctl -u systemd-udevd --follow
```

### Problem: "Failed to initialize USB Relais"

Wenn PowerManager immer noch nicht funktioniert:

```bash
# 1. Überprüfe ob Device im Container sichtbar ist:
docker exec lox-audioserver ls -la /dev/ttyUSB*

# 2. Überprüfe Logs:
docker logs lox-audioserver | grep -i "powermanagement\|usbrelay"

# 3. Teste ob Gerät lesbar ist:
docker exec lox-audioserver cat /dev/ttyUSB0 &
# (Relais ausstecken/einstecken, sollte Ausgabe zeigen)
```

### Problem: Permission Denied

```bash
# Lösung: Unraid Terminal
chmod 666 /dev/ttyUSB_RELAY
# Oder im Container privileged mode:
# docker-compose.yml:
#   privileged: true
```

## Alternative: Feste Port-Mapping

Wenn du eine feste `/dev/ttyUSB0` möchtest statt Symlink:

```bash
# Modify /etc/udev/rules.d/99-usbrelay.rules:
SUBSYSTEMS=="usb", ATTRS{idVendor}=="16c0", ATTRS{idProduct}=="05df", ENV{ID_USB_INTERFACE_NUM}=="00", SYMLINK+="ttyUSB_RELAY", MODE="0666"
```

## Verifizierung

Nach Setup sollte das funktionieren:

```bash
# 1. Unraid Terminal:
ls -la /dev/ttyUSB_RELAY

# 2. Im Container:
docker exec lox-audioserver ls -la /dev/ttyUSB0

# 3. Test PowerManager:
curl http://localhost:7090/admin/api/powermanager/status | jq
# Expected: "enabled": true
```

---

**💡 Wichtig:**
- udev-Rules sind **persistent** auf Unraid (überleben Reboots)
- Name `ttyUSB_RELAY` ist aussagekräftig - gerne ändern
- Rule muss im Format `99-*.rules` sein (hohe Priorität)
- Relais muss immer angesteckt sein beim Start
