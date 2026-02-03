# USB Relais PowerManager Konfiguration

## Übersicht

Der PowerManager steuert automatisch ein USB-Relais (z.B. ARCELI SRD-05VDC-SL-C), um den Verstärker / die Soundkarte einzuschalten, wenn Musik gespielt wird, und auszuschalten, wenn die Wiedergabe stoppt. Dies spart Strom und verhindert Standby-Klicks.

## ARCELI USB Relais Modul

**Modell:** SRD-05VDC-SL-C (Single Channel) oder SRD-05VDC-SL-A (Multi-Channel)

**Verbindung:** USB (virtueller COM-Port)

**Protokoll:** 3-Byte Befehle
- ON:  `0xFF 0x01 0x01` (Kanal 1 einschalten)
- OFF: `0xFF 0x01 0x00` (Kanal 1 ausschalten)

---

## Installation & Konfiguration

### Schritt 1: USB-Gerät identifizieren

Verbinden Sie das ARCELI Relais mit dem Linux-Host und identifizieren Sie den Port:

#### **Linux / Docker Host:**

```bash
# USB-Geräte auflisten
lsusb

# Typische Ausgabe:
# Bus 001 Device 004: ID 1a86:7523 QinHeng Electronics CH340 serial converter

# Serial Port finden
ls -la /dev/ttyUSB*

# Beispiel: /dev/ttyUSB0
```

#### **Windows (falls nötig):**

```powershell
# COM-Port in Device Manager nachschauen
# Typisch: COM3, COM4, etc.
```

### Schritt 2: Docker-Compose anpassen

**Beispiel: docker-compose.yml**

```yaml
version: '3.8'

services:
  loxoneaudioserver:
    container_name: lox-audioserver
    image: ghcr.io/rudyberends/lox-audioserver:latest
    hostname: lox-audioserver
    restart: unless-stopped
    network_mode: host
    
    cap_add:
      - SYS_ADMIN
      - DAC_READ_SEARCH
    
    # ⭐ USB DEVICES - BEIDE erforderlich!
    devices:
      - /dev/snd:/dev/snd        # Soundkarte (Audio)
      - /dev/ttyUSB0:/dev/ttyUSB0  # USB Relais
    
    # ⭐ POWERMANAGER KONFIGURATION
    environment:
      # Aktivierung
      PM_ENABLED: "true"
      
      # USB Port des Relais
      PM_USB_PORT: "/dev/ttyUSB0"
      
      # Baudrate (Standard für ARCELI: 9600)
      PM_USB_BAUD_RATE: "9600"
      
      # Relais Kanal (1-4, abhängig vom Modell)
      PM_CHANNEL: "1"
      
      # Relais einschalten bei Play-Start
      PM_TURN_ON_AT_PLAY: "true"
      
      # Verzögerung nach Stop (Sekunden) - verhindert Klicks bei kurzen Pausen
      PM_TURN_OFF_DELAY: "5"
    
    volumes:
      - ./data:/app/data
```

### Schritt 3: Startscript testen

Bevor Sie den vollständigen Container starten, testen Sie die USB-Verbindung:

```bash
# Container starten
docker-compose up -d

# Logs ansehen (sollten PowerManager Meldungen zeigen)
docker-compose logs -f loxoneaudioserver

# Typische erfolgreiche Logs:
# [PowerManagement] USB Relais connected (port=/dev/ttyUSB0, baudRate=9600, channel=1)
```

---

## Konfigurationsoptionen

### Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `PM_ENABLED` | `false` | Aktiviert PowerManagement (`true`/`false`) |
| `PM_USB_PORT` | `/dev/ttyUSB0` | USB-Port des Relais |
| `PM_USB_BAUD_RATE` | `9600` | Serieller Baud-Rate |
| `PM_CHANNEL` | `1` | Relais Kanal (1-4) |
| `PM_TURN_ON_AT_PLAY` | `true` | Relais ON bei Musik-Start |
| `PM_TURN_OFF_DELAY` | `5` | Sekunden bis Relais nach Stop ausschaltet |

### Szenarien

#### **Szenario 1: Standard Single-Channel (Ihre Konfiguration)**

```yaml
PM_ENABLED: "true"
PM_USB_PORT: "/dev/ttyUSB0"
PM_USB_BAUD_RATE: "9600"
PM_CHANNEL: "1"
PM_TURN_ON_AT_PLAY: "true"
PM_TURN_OFF_DELAY: "5"
```

#### **Szenario 2: Multi-Channel (4 Relais für verschiedene Zonen)**

```yaml
# Zone 1: Kanal 1
PM_ENABLED: "true"
PM_USB_PORT: "/dev/ttyUSB0"
PM_CHANNEL: "1"

# Zone 2: Kanal 2 (müsste separat konfiguriert werden)
# → Mehrere Relais brauchen separate Instanzen
```

#### **Szenario 3: Sofortes Ausschalten nach Stop (keine Verzögerung)**

```yaml
PM_TURN_OFF_DELAY: "0"
```

---

## Problemlösung

### Problem: USB-Gerät wird nicht gefunden

**Symptom:**
```
[PowerManagement] Failed to initialize USB Relais: /dev/ttyUSB0 (ENOENT)
```

**Lösungen:**

1. **Port überprüfen:**
   ```bash
   ls -la /dev/ttyUSB*
   # Wenn ttyUSB0 nicht existiert, probieren Sie ttyUSB1, ttyUSB2, etc.
   ```

2. **Container-Device neu mounten:**
   ```bash
   # In docker-compose.yml:
   devices:
     - /dev/ttyUSB1:/dev/ttyUSB1  # ← anderer Port
   ```

3. **USB-Kabel und Hub prüfen:**
   - Verschiedenes USB-Kabel probieren
   - Power-Hub verwenden (wenn nicht genug Strom)

### Problem: Relais bleibt immer OFF

**Symptom:**
```
[PowerManagement] Relay turned ON
# aber Relais macht kein Klick-Geräusch
```

**Lösungen:**

1. **Channel überprüfen:**
   ```yaml
   PM_CHANNEL: "1"  # Muss korrekt sein für Ihr Modell
   ```

2. **Baud Rate nicht unterstützt:**
   ```yaml
   PM_USB_BAUD_RATE: "115200"  # Manche Modelle nutzen 115200
   ```

3. **Test-Modus nutzen:**
   - In den Code eine Test-Funktion hinzufügen (siehe unten)

### Problem: Relais hat Feedback-Geräusche / Klicks

**Symptom:** Audibles Klicken im Ton wenn Relais ein-/ausschaltet

**Lösungen:**

1. **Verzögerung erhöhen:**
   ```yaml
   PM_TURN_OFF_DELAY: "10"  # 10 Sekunden nach Stop
   ```

2. **Nur bei echtem Stop ausschalten (nicht bei Pause):**
   - Wird bereits so implementiert

3. **Relais weiter entfernt vom Audio-Eingang positionieren**

---

## Debugging & Test

### Logging aktivieren

Um detaillierte Logs zu sehen:

```bash
# Container mit Debug-Logging starten
docker-compose down
# In docker-compose.yml hinzufügen:
# NODE_ENV: "development"
docker-compose up -d

# Logs verfolgen
docker-compose logs -f loxoneaudioserver | grep -i power
```

### Manueller Relais-Test

Sie können eine Test-Funktion über ein HTTP-Endpoint aufrufen (muss im Code hinzugefügt werden):

```typescript
// In adminApiHandler.ts hinzufügen:
app.post('/api/debug/relay-test', async (req, res) => {
  try {
    await powerManager.testRelay(3);  // 3 Zyklen
    res.json({ ok: true, message: 'Test completed' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
```

Dann:
```bash
curl -X POST http://localhost:7090/api/debug/relay-test
```

---

## Systemintegration

### Mit Loxone Miniserver

Der Relais wird **automatisch** gesteuert - keine manuelle Konfiguration nötig:

1. Zone spielt Musik → Relais schaltet EIN
2. Zone stoppt Musik → Relais schaltet nach 5s AUS
3. Zone pausiert → Relais bleibt AN (bereit zum Resume)

### Mit Music Assistant & Home Assistant

Das Relais wird von lox-audioserver unabhängig gesteuert:
- Music Assistant `play()` → Relais ON
- Music Assistant `stop()` → Relais OFF nach Verzögerung

---

## Hardware-Tipps

### ARCELI USB Relais - Verdrahtung

```
Relais Modul:
┌─────────────────────┐
│ USB  GND  IN1  VCC  │
├─────────────────────┤
│ ↓    ↓   ↓    ↓    │
│ ┌────┴─┬─┴────┬───┐│
│ │USB   │Relais│   ││
│ │Port  │Logic │   ││
└─────────────────────┘

Schaltschema:
Verstärker Strom ──→ [Relais Kontakt (NC)] ──→ Verstärker
                     ↑
                     USB Relais Modul steuert den Kontakt
```

### Strom sparen

Mit dieser Konfiguration spart Ihre Setup folgendes:
- **Standby-Strom:** Verstärker ist komplett ausgeschaltet
- **Keine Klicks:** 5-Sekunden Verzögerung verhindert Pops
- **Automatisch:** Kein manuelles Einschalten nötig

---

## Wartung & Support

### Logs überprüfen

```bash
# PowerManager Logs
docker logs lox-audioserver | grep -i "powermanagement\|relay"

# Alle Logs
docker logs lox-audioserver | tail -100
```

### Konfiguration zur Laufzeit anpassen

Änderungen erfordern Container-Neustart:

```bash
# In docker-compose.yml Umgebungsvariablen anpassen
# Dann:
docker-compose restart lox-audioserver
```

### Relais zurücksetzen

Falls das Relais steckt:

```bash
# USB Port neu initialisieren
sudo sh -c 'echo "1-2:1.0" > /sys/bus/usb/drivers/usbfs/unbind'
sleep 1
sudo sh -c 'echo "1-2:1.0" > /sys/bus/usb/drivers/usbfs/bind'

# Container neu starten
docker-compose restart lox-audioserver
```

---

## Nächste Schritte

1. **USB Relais anschließen** und Port identifizieren
2. **docker-compose.yml anpassen** (Port + Umgebungsvariablen)
3. **Container starten** und Logs überprüfen
4. **Musik spielen** und Relais hören
5. **Verzögerung anpassen** falls nötig

Viel Erfolg! 🔌🔊
