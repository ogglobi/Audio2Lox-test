# Audio Configuration UI Integration Guide

Diese Dokumentation beschreibt die neu hinzugefügten API-Endpoints für die Audio-Gerätekonfiguration und deren Verwendung in der Admin-UI.

## 1. Neue API-Endpoints

### Audio-Geräteerkennung

**GET /admin/api/audio/devices**

Gibt alle verfügbaren ALSA-Audio-Geräte zurück.

```json
{
  "devices": [
    {
      "id": "hw:0",
      "cardId": 0,
      "deviceId": 0,
      "name": "PCH",
      "longName": "HDA Intel PCH",
      "driver": "",
      "channels": [
        {
          "id": "hw:0,0",
          "name": "ALC892 Analog",
          "direction": "playback",
          "cardId": 0,
          "deviceId": 0,
          "subdeviceCount": 1
        }
      ]
    }
  ]
}
```

### Squeezelite-Player-Erkennung

**GET /admin/api/audio/squeezelite/players**

Gibt alle verfügbaren Squeezelite/SlimProto-Player zurück, die über das System erreichbar sind.

```json
{
  "players": [
    {
      "id": "aa:bb:cc:dd:ee:ff",
      "name": "Wohnzimmer",
      "ip": "192.168.1.100",
      "port": 3483,
      "isLocal": true
    }
  ]
}
```

### Zone-Output-Konfiguration abrufen

**GET /admin/api/zones/{zoneId}/output**

Gibt die aktuelle Output-Konfiguration einer Zone zurück.

```json
{
  "zoneId": 1,
  "zoneName": "Living Room",
  "output": {
    "id": "squeezelite",
    "playerId": "aa:bb:cc:dd:ee:ff",
    "playerName": "Living Room Speaker"
  },
  "availableOutputTypes": ["squeezelite", "airplay", "dlna", "snapcast"]
}
```

### Zone-Output-Konfiguration speichern

**POST /admin/api/zones/{zoneId}/output**

Speichert die Output-Konfiguration einer Zone.

**Request Body:**
```json
{
  "output": {
    "id": "squeezelite",
    "playerId": "aa:bb:cc:dd:ee:ff",
    "playerName": "Living Room Speaker"
  }
}
```

**Response:**
```json
{
  "success": true,
  "zoneId": 1,
  "output": {
    "id": "squeezelite",
    "playerId": "aa:bb:cc:dd:ee:ff",
    "playerName": "Living Room Speaker"
  }
}
```

### PowerManager-Test

**POST /admin/api/powermanager/test**

Triggert einen Test-Impuls am USB-Relais (falls PowerManager konfiguriert ist).

```json
{
  "success": true,
  "message": "PowerManager test triggered (if enabled)"
}
```

## 2. UI-Komponenten

### 2.1 Audio-Geräte-Panel

Ein neues Panel in der Admin-UI, das Folgendes zeigt:

```
┌─ AUDIO DEVICES ─────────────────────────┐
│                                         │
│ Available Audio Cards:                  │
│  ☐ HDA Intel PCH (hw:0)                │
│     └─ ALC892 Analog (hw:0,0)          │
│        Direction: Playback              │
│        Subdevices: 1                    │
│                                         │
│  ☐ USB Audio Device (hw:1)             │
│     └─ USB Audio (hw:1,0)              │
│        Direction: Playback              │
│        Subdevices: 1                    │
│                                         │
│ [🔄 Refresh]                           │
└─────────────────────────────────────────┘
```

**Implementation Notes:**
- Fetch-Interval: 5-10 Sekunden oder bei Bedarf
- Cache-Audiotgerate zwischen Refreshes
- Icon/Badge für erkannte Geräte
- Error-Handling für fehlende Geräte

### 2.2 Squeezelite-Player-Panel

Zeigt alle verfügbaren Squeezelite-Player an:

```
┌─ SQUEEZELITE PLAYERS ───────────────────┐
│                                         │
│ Available Players:                      │
│  ☑ Wohnzimmer (aa:bb:cc:dd:ee:ff)    │
│     IP: 192.168.1.100 | Port: 3483    │
│     Status: Connected                  │
│                                         │
│  ☐ Küche (aa:bb:cc:dd:ee:gg)         │
│     Status: Not Connected              │
│                                         │
│ [🔄 Refresh]                           │
└─────────────────────────────────────────┘
```

**Implementation Notes:**
- Live-Update bei Player-Verbindung/Trennung
- Status-Indikator (Connected/Disconnected)
- MAC-Adresse anzeigen (für Debugging)

### 2.3 Zone-Output-Mapper

Pro Zone ein Bereich zum Konfigurieren des Outputs:

```
┌─ Zone: Living Room (ID: 1) ─────────────┐
│                                         │
│ Output Configuration:                   │
│                                         │
│ Output Type: [Squeezelite ▼]           │
│                                         │
│ Player Selection:                       │
│  ○ By MAC Address                      │
│    [aa:bb:cc:dd:ee:ff________]         │
│  ◉ By Name                             │
│    [Living Room Speaker____]           │
│                                         │
│ [Load from Device] [Save] [Reset]      │
└─────────────────────────────────────────┘
```

**Implementation Notes:**
- Dropdown für verschiedene Output-Types
- Dynamische Felder je nach Output-Typ
- Validierung vor dem Speichern
- Bestätigungsdialog für Änderungen

### 2.4 PowerManager-Kontrollpanel

Status und Test-Controls für PowerManager:

```
┌─ POWER MANAGEMENT ──────────────────────┐
│                                         │
│ Status: ✓ Enabled                      │
│ USB Port: /dev/ttyUSB0                 │
│ Baud Rate: 9600                        │
│ Current State: Standby                 │
│                                         │
│ [Test Relay] [Turn On] [Turn Off]      │
│                                         │
│ ⓘ Last action: Turned ON (10s ago)     │
└─────────────────────────────────────────┘
```

**Implementation Notes:**
- Echtzeit-Status-Updates via WebSocket (optional)
- Sicherheitsbestätigung für Relais-Tests
- Cooldown zwischen Relais-Operationen

## 3. Frontend Implementation Guide

### 3.1 HTTP-Client für Audio API

```typescript
class AudioDeviceClient {
  async getAvailableDevices(): Promise<AudioDevice[]> {
    const response = await fetch('/admin/api/audio/devices');
    const data = await response.json();
    return data.devices;
  }

  async getAvailablePlayers(): Promise<SqueezelitePlayer[]> {
    const response = await fetch('/admin/api/audio/squeezelite/players');
    const data = await response.json();
    return data.players;
  }

  async getZoneOutput(zoneId: number): Promise<ZoneOutputConfig> {
    const response = await fetch(`/admin/api/zones/${zoneId}/output`);
    const data = await response.json();
    return data.output;
  }

  async saveZoneOutput(
    zoneId: number,
    output: ZoneOutputConfig,
  ): Promise<void> {
    const response = await fetch(`/admin/api/zones/${zoneId}/output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output }),
    });
    if (!response.ok) {
      throw new Error('Failed to save zone output');
    }
  }

  async testPowerManager(): Promise<void> {
    const response = await fetch('/admin/api/powermanager/test', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Power manager test failed');
    }
  }
}
```

### 3.2 State Management (Vue/React Pattern)

```typescript
// Audio Store
interface AudioState {
  devices: AudioDevice[];
  players: SqueezelitePlayer[];
  selectedZoneId: number | null;
  zoneOutputConfigs: Map<number, ZoneOutputConfig>;
  loading: boolean;
  error: string | null;
}

// Getters/Selectors
function getZoneOutput(state: AudioState, zoneId: number) {
  return state.zoneOutputConfigs.get(zoneId);
}

function getAvailableOutputsForZone(state: AudioState, zoneId: number) {
  const output = state.zoneOutputConfigs.get(zoneId);
  return output?.id === 'squeezelite' ? state.players : [];
}

// Actions
async function loadAudioDevices(state: AudioState) {
  state.loading = true;
  try {
    state.devices = await client.getAvailableDevices();
    state.error = null;
  } catch (err) {
    state.error = String(err);
  } finally {
    state.loading = false;
  }
}

async function saveZoneOutput(state: AudioState, zoneId: number, output: any) {
  try {
    await client.saveZoneOutput(zoneId, output);
    state.zoneOutputConfigs.set(zoneId, output);
    state.error = null;
  } catch (err) {
    state.error = String(err);
    throw err;
  }
}
```

### 3.3 Channel-to-Zone Mapping (Advanced)

Für die erweiterte Funktionalität, einzelne Audio-Kanäle Zones zuzuweisen:

```typescript
interface ChannelZoneMapping {
  zoneId: number;
  deviceId: string; // e.g., "hw:0,0"
  channelAssignments: {
    left?: number;   // 0-indexed channel
    right?: number;  // 0-indexed channel
    mono?: number;   // For mono devices
  };
}

// API Extension (für zukünftige Implementation):
// POST /admin/api/audio/channels/{channelId}/zone/{zoneId}
// GET /admin/api/audio/channels/mappings
```

## 4. Workflow-Beispiel

1. **Benutzer öffnet Audio-Konfiguration**
   - UI lädt verfügbare Audio-Geräte: `GET /admin/api/audio/devices`
   - UI lädt Squeezelite-Player: `GET /admin/api/audio/squeezelite/players`

2. **Benutzer wählt eine Zone**
   - UI lädt aktuelle Output-Config: `GET /admin/api/zones/{zoneId}/output`

3. **Benutzer ändert den Output-Typ**
   - Dynamische UI-Felder werden basierend auf Output-Typ angepasst

4. **Benutzer speichert die Konfiguration**
   - POST-Request mit neuer Config: `POST /admin/api/zones/{zoneId}/output`
   - Konfirmation wird angezeigt

5. **PowerManager-Test (optional)**
   - Benutzer klickt auf "Test Relay"
   - POST-Request an: `POST /admin/api/powermanager/test`
   - Kurzer Relais-Impuls wird ausgelöst

## 5. Error Handling

Die API gibt standardisierte Error-Responses zurück:

```json
{
  "error": "invalid-zone-id"
}
```

Mögliche Error-Codes:
- `invalid-zone-id`: Zone-ID ist nicht numerisch oder <= 0
- `zone-not-found`: Zone mit dieser ID existiert nicht
- `invalid-body`: Request-Body ist nicht valid JSON
- `invalid-output-config`: Output-Konfiguration ist ungültig
- `audio-device-discovery-failed`: Audio-Geräteerkennung fehlgeschlagen
- `squeezelite-discovery-failed`: Squeezelite-Spielererkennung fehlgeschlagen
- `zone-output-config-failed`: Abrufen der Zone-Output-Config fehlgeschlagen
- `zone-output-update-failed`: Speichern der Zone-Output-Config fehlgeschlagen
- `power-manager-test-failed`: PowerManager-Test fehlgeschlagen

## 6. Debugging-Tipps

### Curl-Beispiele

```bash
# Audio-Geräte abrufen
curl http://localhost:8080/admin/api/audio/devices

# Squeezelite-Player abrufen
curl http://localhost:8080/admin/api/audio/squeezelite/players

# Zone-Output-Config abrufen
curl http://localhost:8080/admin/api/zones/1/output

# Zone-Output-Config speichern
curl -X POST http://localhost:8080/admin/api/zones/1/output \
  -H "Content-Type: application/json" \
  -d '{"output":{"id":"squeezelite","playerId":"aa:bb:cc:dd:ee:ff"}}'

# PowerManager-Test
curl -X POST http://localhost:8080/admin/api/powermanager/test
```

### Browser Console Debugging

```javascript
// Audio-Geräte laden und anzeigen
fetch('/admin/api/audio/devices')
  .then(r => r.json())
  .then(data => console.log('Devices:', data.devices));

// Squeezelite-Player laden
fetch('/admin/api/audio/squeezelite/players')
  .then(r => r.json())
  .then(data => console.log('Players:', data.players));
```

## 7. Nächste Schritte

1. **UI-Implementation**: Komponenten basierend auf diesem Guide implementieren
2. **Frontend-Integration**: Audio-Client in bestehende Admin-UI integrieren
3. **Advanced Features**:
   - Live-Updates via WebSocket für Geräteerkennung
   - Kanäl-zu-Zone-Mapping Interface
   - Audio-Streaming-Test-Funktionalität
4. **Testing**: E2E-Tests für Audio-Konfigurationspfade
