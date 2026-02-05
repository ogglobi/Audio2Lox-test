# USB Relais HID Gerät - Unraid Konfiguration

## ⚠️ WICHTIG: HID statt SerialPort

Das USBRelay2 (16c0:05df) wird vom Kernel als **HID-Gerät** erkannt, nicht als serielles Gerät!

- ✅ **Gerät erkannt als:** `/dev/hidraw2` oder `/dev/usb/hiddev2`
- ❌ **NICHT als:** `/dev/ttyUSB0` (SerialPort)

---

## Schritt 1: PowerManager ist aktualisiert

Die neue Version (`usbRelayManager.ts`) nutzt jetzt direkt HID-Geräte statt SerialPort:

```typescript
// Alt (DEFEKT):
import SerialPort from 'serialport';  // ❌ Funktioniert nicht mit HID

// Neu (FUNKTIONIERT):
import { promises as fs } from 'fs';  // ✅ HID-Datei-API
```

---

## Schritt 2: Docker-Compose aktualisieren

```yaml
services:
  loxoneaudioserver:
    devices:
      - /dev/snd:/dev/snd                 # Audio
      - /dev/hidraw2:/dev/hidraw0         # USB Relais HID
      
    environment:
      PM_ENABLED: "true"
      PM_USB_PORT: "/dev/hidraw0"         # ← HID Pfad (mapped!)
      PM_USB_BAUD_RATE: "9600"            # Wird ignoriert bei HID
      PM_CHANNEL: "1"
      PM_TURN_ON_AT_PLAY: "true"
      PM_TURN_OFF_DELAY: "5"
```

---

## Schritt 3: Auf Unraid im GUI

**1. Container Template öffnen:**
- Gehe zu: **Docker** → Container auswählen → **Edit**

**2. Device Mapping ändern:**

Alte Konfiguration (FEHLER):
```
/dev/ttyUSB_RELAY:/dev/ttyUSB0
```

**Neue Konfiguration (RICHTIG):**
```
/dev/usb/hiddev2:/dev/hidraw0
```

Oder alternativ:
```
/dev/hidraw2:/dev/hidraw0
```

**3. Environment Variable aktualisieren:**
```
PM_USB_PORT=/dev/hidraw0
```

**4. Container neu starten:**
- Docker → Container → Restart

---

## Schritt 4: Teste die Konfiguration

```bash
# SSH in Unraid

# Relais-Gerät finden:
lsusb | grep 16c0

# Sollte zeigen: ID 16c0:05df

# Verfügbare HID-Geräte:
ls -la /dev/hidraw*
ls -la /dev/usb/hiddev*

# In Container:
docker exec lox-audioserver ls -la /dev/hidraw0
```

---

## Schritt 5: Logs prüfen

```bash
# PowerManager Init Logs:
docker logs lox-audioserver 2>&1 | grep -i "USB Relais\|PowerManager\|HID device"

# Sollte zeigen:
# ✅ HID device verified
# ✅ USB Relais initialized successfully
```

---

## Was ändert sich für Sie?

| Was | Alt (SerialPort) | Neu (HID) |
|-----|-----------------|----------|
| **Gerät** | `/dev/ttyUSB0` | `/dev/hidraw0` (oder hiddev2) |
| **Abhängigkeit** | `serialport` npm | `fs` (built-in) |
| **Funktionalität** | ❌ Nicht erkannt | ✅ Funktioniert jetzt |
| **Befehl-Format** | `0xFF 0x01 0x01` | `0xFF 0x01 0x01` (gleich!) |

---

## Troubleshooting

**Problem:** `PM_USB_PORT=/dev/hidraw0 nicht gefunden`

**Lösung:**
1. Check: `lsusb | grep 16c0`
2. Find Device: `ls /dev/hidraw*` oder `ls /dev/usb/hiddev*`
3. Update in docker-compose (welcher Pfad wirklich existiert)

**Problem:** `Error: Failed to open HID device`

**Lösung:**
1. Device Mapping in docker-compose prüfen
2. Container neu bauen: `docker-compose up -d --build`
3. Perms check: `ls -la /dev/hidraw0`

---

## Kommando-Format (bleibt gleich)

```typescript
// Relais EINSCHALTEN (Channel 1):
0xFF 0x01 0x01

// Relais AUSSCHALTEN (Channel 1):
0xFF 0x01 0x00
```

Das sendCommand() macht das automatisch jetzt über HID statt SerialPort.

---

## Nächste Schritte

1. ✅ Container neu bauen mit neuem Code
2. ✅ Device Mapping auf Unraid aktualisieren
3. ✅ PM_USB_PORT auf `/dev/hidraw0` ändern
4. ✅ Container starten und testen
5. ✅ Relais sollte jetzt anspringen bei Musik-Play!
