# Audio Configuration API Testing Guide

Dieses Dokument beschreibt, wie die neuen Audio-Discovery-API-Endpoints getestet werden können.

## Quick Start

### 1. Server starten

```bash
npm run build
npm start
```

Server läuft dann auf `http://localhost:8080`

### 2. API-Endpoints testen

#### Audio-Geräte abrufen

```bash
curl -X GET http://localhost:8080/admin/api/audio/devices
```

**Expected Response (200 OK):**
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

#### Squeezelite-Player abrufen

```bash
curl -X GET http://localhost:8080/admin/api/audio/squeezelite/players
```

**Expected Response (200 OK):**
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

Wenn keine Player verbunden sind:
```json
{
  "players": [
    {
      "id": "aa:bb:cc:dd:ee:ff",
      "name": "Squeezelite Player (Example)",
      "isLocal": true
    }
  ]
}
```

#### Zone-Output-Konfiguration abrufen

```bash
curl -X GET http://localhost:8080/admin/api/zones/1/output
```

**Expected Response (200 OK):**
```json
{
  "zoneId": 1,
  "zoneName": "Living Room",
  "output": null,
  "availableOutputTypes": ["squeezelite", "airplay", "dlna", "snapcast"]
}
```

Wenn bereits ein Output konfiguriert ist:
```json
{
  "zoneId": 1,
  "zoneName": "Living Room",
  "output": {
    "id": "squeezelite",
    "playerId": "aa:bb:cc:dd:ee:ff",
    "playerName": "Wohnzimmer"
  },
  "availableOutputTypes": ["squeezelite", "airplay", "dlna", "snapcast"]
}
```

#### Zone-Output-Konfiguration speichern

```bash
curl -X POST http://localhost:8080/admin/api/zones/1/output \
  -H "Content-Type: application/json" \
  -d '{
    "output": {
      "id": "squeezelite",
      "playerId": "aa:bb:cc:dd:ee:ff",
      "playerName": "Wohnzimmer"
    }
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "zoneId": 1,
  "output": {
    "id": "squeezelite",
    "playerId": "aa:bb:cc:dd:ee:ff",
    "playerName": "Wohnzimmer"
  }
}
```

**Fehler - Ungültige Zone:**
```bash
curl -X GET http://localhost:8080/admin/api/zones/9999/output
```

Response (404 Not Found):
```json
{
  "error": "zone-not-found"
}
```

#### PowerManager Test

```bash
curl -X POST http://localhost:8080/admin/api/powermanager/test
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "PowerManager test triggered (if enabled)"
}
```

## Detaillierte Test-Szenarien

### Szenario 1: Audio-Geräte erkennen

**Voraussetzung:**
- Linux-System mit ALSA-Sound

**Schritte:**
1. `GET /admin/api/audio/devices` aufrufen
2. Response überprüfen: Sollte mindestens `hw:0` enthalten
3. Neue USB-Audio-Geräte einstecken
4. Endpoint erneut aufrufen
5. Neues Gerät sollte in der Liste sein

**Erwartet:**
- Alle ALSA-Geräte mit `hw:X,Y` ID
- Kanäle mit `playback` oder `capture` Direction
- Subdevice-Zählung

### Szenario 2: Squeezelite-Player-Erkennung

**Voraussetzung:**
- Laufender SqueezeliteCore Server
- Mindestens ein Squeezelite-Client verbunden

**Schritte:**
1. `GET /admin/api/audio/squeezelite/players` aufrufen
2. Verbundene Player sollten in der Liste sein
3. Player-Name und MAC-Adresse überprüfen
4. Einen Player aus dem Netzwerk trennen
5. Endpoint erneut aufrufen
6. Player sollte nicht mehr sichtbar sein

**Erwartet:**
- Liste der verbundenen Squeezelite-Player
- Jeder Player mit MAC-Adresse (ID) und Name
- IP-Adresse (optional)

### Szenario 3: Zone-Output-Konfiguration

**Voraussetzung:**
- Mindestens eine Zone in der Konfiguration

**Schritte:**

**3a. Aktuelle Konfiguration abrufen:**
```bash
curl -X GET http://localhost:8080/admin/api/zones/1/output
```
- Sollte aktuelle Output-Config (oder null) zeigen

**3b. Neue Konfiguration speichern:**
```bash
curl -X POST http://localhost:8080/admin/api/zones/1/output \
  -H "Content-Type: application/json" \
  -d '{
    "output": {
      "id": "squeezelite",
      "playerId": "aa:bb:cc:dd:ee:ff"
    }
  }'
```
- Sollte Success-Response geben

**3c. Geänderte Konfiguration überprüfen:**
```bash
curl -X GET http://localhost:8080/admin/api/zones/1/output
```
- Sollte gespeicherte Konfiguration zeigen

**Erwartet:**
- Config wird in config.json persistiert
- Zone erhält neu konfigurieren Output
- Playback verwendet neuen Output automatisch

### Szenario 4: Fehlerbehandlung

**Test: Ungültige Zone-ID**
```bash
curl -X GET http://localhost:8080/admin/api/zones/abc/output
```
Response (400 Bad Request):
```json
{
  "error": "invalid-zone-id"
}
```

**Test: Nicht-existierende Zone**
```bash
curl -X GET http://localhost:8080/admin/api/zones/9999/output
```
Response (404 Not Found):
```json
{
  "error": "zone-not-found"
}
```

**Test: Ungültige POST-Daten**
```bash
curl -X POST http://localhost:8080/admin/api/zones/1/output \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```
Response (400 Bad Request):
```json
{
  "error": "invalid-body"
}
```

## Browser Console Testing

Öffne die Admin-UI im Browser (`http://localhost:8080/admin/`) und führe folgende Tests aus:

```javascript
// Test 1: Audio-Geräte laden
fetch('/admin/api/audio/devices')
  .then(r => r.json())
  .then(data => {
    console.log('Audio Devices:');
    console.table(data.devices);
  })
  .catch(err => console.error('Error:', err));

// Test 2: Squeezelite-Player laden
fetch('/admin/api/audio/squeezelite/players')
  .then(r => r.json())
  .then(data => {
    console.log('Squeezelite Players:');
    console.table(data.players);
  })
  .catch(err => console.error('Error:', err));

// Test 3: Zone-Output-Config abrufen
const zoneId = 1;
fetch(`/admin/api/zones/${zoneId}/output`)
  .then(r => r.json())
  .then(data => {
    console.log(`Zone ${zoneId} Output Config:`, data);
  })
  .catch(err => console.error('Error:', err));

// Test 4: Zone-Output-Config speichern
const zoneId = 1;
const outputConfig = {
  id: "squeezelite",
  playerId: "aa:bb:cc:dd:ee:ff",
  playerName: "Living Room"
};

fetch(`/admin/api/zones/${zoneId}/output`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ output: outputConfig })
})
  .then(r => r.json())
  .then(data => {
    console.log('Save Result:', data);
  })
  .catch(err => console.error('Error:', err));

// Test 5: PowerManager Test
fetch('/admin/api/powermanager/test', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('PowerManager Test Result:', data);
  })
  .catch(err => console.error('Error:', err));
```

## Performance Testing

### Test mit ab (Apache Bench)

```bash
# 100 Requests zu Audio Devices
ab -n 100 -c 10 http://localhost:8080/admin/api/audio/devices

# 100 Requests zu Squeezelite Players
ab -n 100 -c 10 http://localhost:8080/admin/api/audio/squeezelite/players
```

**Erwartete Performance:**
- Audio Devices: < 100ms pro Request
- Squeezelite Players: < 50ms pro Request
- Zone Output Config: < 20ms pro Request

### Last Testing mit wrk

```bash
wrk -t4 -c100 -d30s http://localhost:8080/admin/api/audio/devices
```

## Integration Testing

### Test-Suite für Backend

```typescript
describe('Audio Configuration API', () => {
  it('GET /admin/api/audio/devices should return array', async () => {
    const response = await fetch('/admin/api/audio/devices');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.devices)).toBe(true);
  });

  it('GET /admin/api/audio/squeezelite/players should return array', async () => {
    const response = await fetch('/admin/api/audio/squeezelite/players');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.players)).toBe(true);
  });

  it('GET /admin/api/zones/{id}/output should fail with invalid ID', async () => {
    const response = await fetch('/admin/api/zones/invalid/output');
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('invalid-zone-id');
  });

  it('POST /admin/api/zones/{id}/output should save config', async () => {
    const response = await fetch('/admin/api/zones/1/output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        output: {
          id: 'squeezelite',
          playerId: 'aa:bb:cc:dd:ee:ff'
        }
      })
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## Troubleshooting

### Problem: Audio Devices Returns Empty List

**Mögliche Ursachen:**
1. Linux-System ohne ALSA
2. Audio-Tools nicht installiert (`arecord`, `aplay`)

**Lösung:**
```bash
# Check ob arecord/aplay verfügbar sind
which arecord
which aplay

# Unter Debian/Ubuntu installieren:
sudo apt-get install alsa-utils

# Test:
arecord -l
aplay -l
```

### Problem: Squeezelite Players Returns Only Example

**Mögliche Ursachen:**
1. SqueezeliteCore nicht gestartet
2. Keine Squeezelite-Clients verbunden

**Lösung:**
```bash
# Überprüfen ob SqueezeliteCore lädt
ps aux | grep squeezelite

# Logs ansehen
tail -f logs/audio-server.log | grep -i squeezelite
```

### Problem: Zone Output Config Not Saving

**Mögliche Ursachen:**
1. Zone existiert nicht
2. Config nicht writable
3. Ungültige Output-Struktur

**Lösung:**
```bash
# Zone-ID überprüfen
curl http://localhost:8080/admin/api/config | jq '.zones[].id'

# File-Permissions überprüfen
ls -l config.json

# Logs überprüfen
tail -f logs/admin-api.log | grep zone-output
```

## Debugging mit Logs

Aktiviere Debug-Logs für Audio-Adapter:

```bash
# In .env setzen
LOGLEVEL=debug

# Oder beim Start:
LOGLEVEL=debug npm start
```

Log-Files überprüfen:
```bash
# Echtzeit-Logs anschauen
tail -f logs/audio-server.log | grep -E 'Audio|Device|Squeezelite'

# Alle Fehler anschauen
grep ERROR logs/audio-server.log
```

## Checklist für vollständige Testing

- [ ] GET `/admin/api/audio/devices` - Returns valid device list
- [ ] GET `/admin/api/audio/squeezelite/players` - Returns valid player list  
- [ ] GET `/admin/api/zones/{id}/output` - Returns current config
- [ ] POST `/admin/api/zones/{id}/output` - Saves new config
- [ ] POST `/admin/api/zones/{id}/output` - Validates zone exists
- [ ] POST `/admin/api/zones/{id}/output` - Validates output structure
- [ ] POST `/admin/api/powermanager/test` - Test triggers
- [ ] Error handling - All 400/404 errors return proper messages
- [ ] Performance - All endpoints respond < 200ms
- [ ] Persistence - Config saved to file survives restart
