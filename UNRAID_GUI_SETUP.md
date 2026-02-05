# Unraid GUI - Lox AudioServer Container Konfiguration

## 🐳 KOMPLETTE KONFIGURATIONSLISTE FÜR UNRAID WEBUI

Diese Liste enthält ALLES, was du in der Unraid Docker-GUI eintragen musst.

---

## 📋 CONTAINER NAME & IMAGE

| Setting | Wert |
|---------|------|
| **Container Name** | `lox-audioserver` |
| **Repository** | `ghcr.io/rudyberends/lox-audioserver:latest` |

---

## 🔌 PORTS (Port Mappings)

Alle diese Ports müssen gemappt sein:

| Container Port | Host Port | Protokoll | Beschreibung |
|----------------|-----------|-----------|--------------|
| 7090 | 7090 | TCP | HTTP API & Admin UI |
| 7091 | 7091 | TCP | Loxone Server |
| 7095 | 7095 | TCP | Loxone Server |
| 7080 | 7080 | TCP | Line-In Ingest |
| 1704 | 1704 | TCP | Snapcast |
| 3483 | 3483 | TCP | SlimProto |
| 9090 | 9090 | TCP | LMS CLI (Telnet) |
| 9000 | 9000 | TCP | LMS JSON-RPC |

---

## 🔧 DEVICES (USB & Audio)

Diese MÜSSEN hinzugefügt werden:

| Container Path | Host Path | Beschreibung |
|----------------|-----------|--------------|
| `/dev/snd` | `/dev/snd` | Audio Soundkarte (ALSA) |
| `/dev/ttyUSB0` | `/dev/ttyUSB_RELAY` | USB Relais (via udev-Rule) |

**So in Unraid hinzufügen:**
1. Scrolle zu "Devices" Sektion
2. Klick "Add another Path"
3. Wähle **Type: Device**
4. **Container Path:** `/dev/snd` → **Host Path:** `/dev/snd`
5. Nochmal "Add another Path"
6. **Container Path:** `/dev/ttyUSB0` → **Host Path:** `/dev/ttyUSB_RELAY`

---

## 🌍 ENVIRONMENT VARIABLES

Diese müssen ALLE in der "Environment Variables" Sektion eingetragen werden:

### PowerManager (USB Relais) Konfiguration

| Variable Name | Wert | Beschreibung |
|---------------|------|--------------|
| `PM_ENABLED` | `true` | PowerManager aktivieren |
| `PM_USB_PORT` | `/dev/ttyUSB0` | USB-Port des Relais im Container |
| `PM_USB_BAUD_RATE` | `9600` | Baudrate (ARCELI Standard) |
| `PM_CHANNEL` | `1` | Relais-Kanal (1-4) |
| `PM_TURN_ON_AT_PLAY` | `true` | Relais einschalten wenn Musik spielt |
| `PM_TURN_OFF_DELAY` | `5` | Sekunden bis Relais nach Stop ausschaltet |

---

## 📁 VOLUMES (Persistente Daten)

| Container Path | Host Path | Beschreibung | Access Mode |
|----------------|-----------|--------------|-------------|
| `/app/data` | `/mnt/user/appdata/lox-audioserver/data` | Config, Logs, Cache | RW (read-write) |

**So in Unraid hinzufügen:**
1. Scrolle zu "Volumes" Sektion
2. Klick "Add another Path"
3. **Container Path:** `/app/data`
4. **Host Path:** `/mnt/user/appdata/lox-audioserver/data`
5. **Access Mode:** `RW`

---

## 🛡️ CAPABILITIES

Diese müssen in der "Advanced" Sektion gesetzt sein:

| Cap to add | Wert |
|------------|------|
| Cap Add | `SYS_ADMIN` |
| Cap Add | `DAC_READ_SEARCH` |

---

## ⚙️ WEITERE EINSTELLUNGEN

| Setting | Wert | Grund |
|---------|------|-------|
| **Restart Policy** | `unless-stopped` | Container startet nach Reboot |
| **Network Mode** | `bridge` (Standard) | Funktioniert mit Port-Mapping |
| **Privileged** | ❌ NEIN (nicht nötig) | Caps reichen aus |
| **Memory Limit** | Leer (unbegrenzt) | App braucht ~300-500MB |
| **CPU Shares** | Standard | Normal |

---

## 🎯 SCHRITT-FÜR-SCHRITT IN UNRAID GUI

### 1️⃣ Container hinzufügen

- Gehe zu **Docker** → **Add Container**
- Wähle **Select a template** → Oder manuell eingeben

### 2️⃣ Basic Settings

```
Container Name:     lox-audioserver
Repository:         ghcr.io/rudyberends/lox-audioserver:latest
Network Type:       Bridge
Restart Policy:     Unless Stopped
```

### 3️⃣ Port Mappings (unter "Show more settings")

Klick **Port Mappings** und füge ALLE ein:

```
Host Port 7090   → Container Port 7090
Host Port 7091   → Container Port 7091
Host Port 7095   → Container Port 7095
Host Port 7080   → Container Port 7080
Host Port 1704   → Container Port 1704
Host Port 3483   → Container Port 3483
Host Port 9090   → Container Port 9090
Host Port 9000   → Container Port 9000
```

### 4️⃣ Devices (unter "Show more settings")

Klick **Devices** und füge ein:

```
Host Device: /dev/snd           → Container Path: /dev/snd
Host Device: /dev/ttyUSB_RELAY  → Container Path: /dev/ttyUSB0
```

### 5️⃣ Volumes (unter "Show more settings")

Klick **Volumes** und füge ein:

```
Host Path: /mnt/user/appdata/lox-audioserver/data
Container Path: /app/data
Access Mode: RW
```

### 6️⃣ Environment Variables (unter "Show more settings")

Klick **Environment Variables** und füge ALLE ein:

```
PM_ENABLED=true
PM_USB_PORT=/dev/ttyUSB0
PM_USB_BAUD_RATE=9600
PM_CHANNEL=1
PM_TURN_ON_AT_PLAY=true
PM_TURN_OFF_DELAY=5
```

### 7️⃣ Capabilities (unter "Show more settings")

Klick **Cap add** und füge ein:
```
SYS_ADMIN
DAC_READ_SEARCH
```

### 8️⃣ Speichern & Starten

- Klick **Apply**
- Container sollte starten
- Überprüfe die Logs mit **View Logs**

---

## ✅ CHECKLISTE ZUM ÜBERPRÜFEN

Nach dem Setup, überprüfe diese Punkte:

```bash
# 1. Container läuft?
docker ps | grep lox-audioserver

# 2. Devices gemappt?
docker exec lox-audioserver ls -la /dev/snd /dev/ttyUSB0

# 3. Relais erkannt?
docker exec lox-audioserver lsusb | grep 16c0

# 4. PowerManager initialisiert?
docker logs lox-audioserver | grep -i "powermanagement"

# 5. API antwortet?
curl http://localhost:7090/admin/api/powermanager/status

# 6. Audio Devices erkannt?
curl http://localhost:7090/admin/api/audio/devices
```

---

## 🚨 HÄUFIGE FEHLER

### ❌ "Device /dev/ttyUSB_RELAY not found"

**Ursache:** udev-Rule nicht konfiguriert oder Relais nicht angesteckt

**Lösung:**
```bash
# Auf Unraid SSH:
ls -la /dev/ttyUSB_RELAY

# Falls nicht da:
# 1. Relais anstecken
# 2. udev-Rule überprüfen (UDEV_DETAILED_GUIDE.md)
```

### ❌ "Failed to initialize USB Relais"

**Ursache:** Device ist nicht im Container sichtbar

**Lösung:**
1. Überprüfe dass Device in der GUI gesetzt ist
2. Container neu starten: `docker-compose restart` oder über Unraid GUI
3. Logs checken: `docker logs lox-audioserver`

### ❌ "Permission denied /dev/snd"

**Ursache:** Container hat keine Berechtigung

**Lösung:**
1. Überprüfe dass **SYS_ADMIN** und **DAC_READ_SEARCH** gesetzt sind
2. Container neustarten

---

## 📝 KOPIERVORLAGE FÜR DICH

Falls du alles schnell eingeben möchtest, hier die Rohfassung:

```
PORTS:
7090:7090, 7091:7091, 7095:7095, 7080:7080, 1704:1704, 3483:3483, 9090:9090, 9000:9000

DEVICES:
/dev/snd → /dev/snd
/dev/ttyUSB_RELAY → /dev/ttyUSB0

VOLUMES:
/mnt/user/appdata/lox-audioserver/data → /app/data (RW)

ENVIRONMENT VARIABLES:
PM_ENABLED=true
PM_USB_PORT=/dev/ttyUSB0
PM_USB_BAUD_RATE=9600
PM_CHANNEL=1
PM_TURN_ON_AT_PLAY=true
PM_TURN_OFF_DELAY=5

CAPABILITIES:
SYS_ADMIN
DAC_READ_SEARCH
```

---

**Fertig! 🎉** Wenn du damit konfiguriert hast, sag mir Bescheid ob es läuft!

