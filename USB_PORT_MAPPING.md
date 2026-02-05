# USB Device Port Mapping Guide

## Dein Setup

Du hast zwei USB-Geräte:

| Gerät | Vendor ID | Product ID | Bedeutung |
|-------|-----------|-----------|-----------|
| **USB Sound Device** | `0d8c` | `0102` | 🎵 Audio-Soundkarte |
| **USBRelay2** | `16c0` | `05df` | ⚡ ARCELI USB-Relais |

## Das Problem

Bei Windows müssen wir `/dev/ttyUSB*` manuell identifizieren, weil es keine echten USB-Geräte im Container gibt. 

Auf **Unraid** werden die Ports **automatisch** erkannt, wenn du die `docker-compose.yml` korrekt konfigurierst.

## Lösung: Port-Identifikation auf Unraid

### Option 1: Automatische Erkennung (Empfohlen)

```bash
# Im Unraid-Terminal:
bash find-usb-device.sh

# Schaut nach /dev/ttyUSB* Ports und zeigt welcher das Relais ist
```

### Option 2: Manuelle Methode

**Schritt 1: Alle USB-Geräte auflisten**
```bash
lsusb
```

Beispiel-Output:
```
Bus 004 Device 012: ID 0d8c:0102  USB Sound Device
Bus 004 Device 011: ID 16c0:05df www.dcttech.com USBRelay2
```

**Schritt 2: Serielle Geräte prüfen**
```bash
ls -la /dev/ttyUSB*
```

Output könnte sein:
```
/dev/ttyUSB0 -> ... (ein Gerät)
/dev/ttyUSB1 -> ... (ein anderes Gerät)
```

**Schritt 3: Welches ist das Relais?**
```bash
# Für jedes ttyUSB-Port prüfen:
udevadm info --query=all --name=/dev/ttyUSB0 | grep VENDOR
udevadm info --query=all --name=/dev/ttyUSB1 | grep VENDOR

# Wenn VENDOR_ID=16c0 erscheint → Das ist dein Relais!
```

**Schritt 4: Kernel-Meldungen checken**
```bash
# Relais ausstecken, warten, wieder einstecken:
dmesg | tail -20

# Output zeigt z.B.:
# usb 4-11: new full-speed USB device number 11 using xhci_hcd
# usb 4-11: new USB device found, idVendor=16c0, idProduct=05df
# ftdi_sio 4-11:1.0: FTDI USB Serial Device converter detected
# usb 4-11: FTDI USB Serial Device converter now attached to ttyUSB0
```

## Docker-Compose Konfiguration

Nachdem du den Port identifiziert hast, aktualisiere die `docker-compose.yml`:

```yaml
services:
  loxoneaudioserver:
    ...
    devices:
      - /dev/snd:/dev/snd              # Audio-Gerät
      - /dev/ttyUSB0:/dev/ttyUSB0      # ← Hier den korrekten Port eintragen!
                                        # Könnte auch ttyUSB1, ttyUSB2 sein
    ...
    environment:
      PM_ENABLED: "true"
      PM_USB_PORT: "/dev/ttyUSB0"      # ← Und hier auch (muss gleich sein!)
      PM_USB_BAUD_RATE: "9600"
      PM_CHANNEL: "1"
      ...
```

## Häufige Szenarien

### Szenario 1: Nur Relais vorhanden
```
/dev/ttyUSB0 → Relais (16c0:05df)

docker-compose.yml:
  devices:
    - /dev/snd:/dev/snd
    - /dev/ttyUSB0:/dev/ttyUSB0
```

### Szenario 2: Relais + andere serielle Geräte
```
/dev/ttyUSB0 → GPS/Sensorik
/dev/ttyUSB1 → Relais (16c0:05df) ← dein Relais!
/dev/ttyUSB2 → andere Sache

docker-compose.yml:
  devices:
    - /dev/snd:/dev/snd
    - /dev/ttyUSB1:/dev/ttyUSB1  ← muss ttyUSB1 sein!
  environment:
    PM_USB_PORT: "/dev/ttyUSB1"  ← auch hier anpassen!
```

### Szenario 3: Relais ist USB3 Hub
```
/dev/ttyUSB2 → Relais (16c0:05df)

docker-compose.yml:
  devices:
    - /dev/ttyUSB2:/dev/ttyUSB2
  environment:
    PM_USB_PORT: "/dev/ttyUSB2"
```

## Problembehebung

### Problem: "Failed to initialize USB Relais"

**Mögliche Ursachen:**
1. ❌ `/dev/ttyUSB0` nicht gemappt → Gerät kann nicht zugreifen
2. ❌ Falscher Port in `PM_USB_PORT` konfiguriert
3. ❌ Relais nicht angesteckt oder defekt
4. ❌ Falscher Baud Rate (sollte 9600 sein)

**Lösung:**
```bash
# 1. Überprüfe ob Relais erkannt wird:
docker exec lox-audioserver lsusb | grep 16c0:05df

# 2. Überprüfe ob Port gemappt ist:
docker exec lox-audioserver ls -la /dev/ttyUSB*

# 3. Überprüfe docker-compose.yml:
# - devices Sektion hat /dev/ttyUSB* einträge?
# - PM_USB_PORT stimmt überein?

# 4. Neustart:
docker-compose down
docker-compose up -d

# 5. Logs prüfen:
docker logs lox-audioserver | grep -i "usbrelay\|powermanagement"
```

### Problem: "Permission denied /dev/ttyUSB0"

**Ursache:** Container hat keine Berechtigung auf das Gerät

**Lösung:**
```bash
# Auf Unraid: setze privileged mode
docker-compose.yml:
  privileged: true

# Oder: setze device_cgroup_rules
  device_cgroup_rules:
    - 'c 188:* rmw'  # ttyUSB*
```

## Test nach Konfiguration

```bash
# 1. Container neu starten
docker-compose down -v
docker-compose up -d

# 2. Diagnostik laufen
bash diagnose-powermanager.sh

# 3. API testen
bash test-audio-api.sh localhost 7090

# 4. PowerManager-Status prüfen
curl http://localhost:7090/admin/api/powermanager/status | jq

# Expected output:
# {
#   "enabled": true,
#   "message": "PowerManager enabled and ready",
#   "state": "idle"
# }
```

## Befehlsübersicht

```bash
# USB-Geräte auflisten
lsusb
lsusb -v          # Mit Details

# Serielle Ports sehen
ls -la /dev/ttyUSB*

# Relais finden (16c0:05df)
lsusb | grep 16c0:05df

# Port des Relais herausfinden
udevadm info --query=all --name=/dev/ttyUSB0 | grep ID_VENDOR

# Kernel-Events bei Gerätewechsel
dmesg | grep -i "ftdi\|usb.*tty"

# Diagnose im Container
docker exec lox-audioserver bash find-usb-device.sh
```

---

**💡 Tipps:**
- Relais sollte **vor** dem Container-Start angesteckt sein
- Baud Rate ist meist immer `9600` (ARCELI Standard)
- Wenn Port sich ändert: Relais auf einen stabilen USB-Port stecken
- Manche USB-Hubs beheben Port-Instabilität

