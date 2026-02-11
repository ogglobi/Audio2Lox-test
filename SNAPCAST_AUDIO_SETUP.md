# Audio2Lox - Snapcast-basiertes Multiroom-Audio Setup

## ⚠️ WICHTIG: Audio-Architektur

Der lox-audioserver hat **BEREITS eingebaut**:
- ✅ Snapcast Server (Multiroom Audio)
- ✅ Spotify Connect Controller  
- ✅ AirPlay Receiver
- ✅ Zone-basierte Audio-Routing

Die **Lösung nutzt NICHT PulseAudio** sondern:
- **Snapserver im Container** - Audio Server (1704/tcp)
- **Snapclient auf dem Unraid-Host** - verbunden mit USB-Soundkarte

## Architektur

```
┌─────────────────────────────────────┐
│ Spotify App / AirPlay / Loxone      │
└────────────────┬────────────────────┘
                 │ Audio Stream
    ┌────────────▼──────────────┐
    │ audio2lox Container       │
    │ ├─ Snapcast Server (1704) │
    │ ├─ Zone routing logic     │
    │ └─ Spotify Connect        │
    └──────────┬────────────────┘
               │ WebSocket /snapcast
    ┌──────────▼─────────────────────┐
    │ Unraid Host (snapclient)       │
    ├─ snapclient (listening)         │
    │  └─ USB Audio (C-Media CM106)  │
    │  └─ Onboard Audio (Realtek)    │
    └────────────────────────────────┘
               │
    ┌──────────▼─────────────┐
    │ Audio Output:          │
    ├─ USB Speaker/Amp      │
    └─ Onboard Speaker      │
    └────────────────────────┘
```

## Setup-Anleitung

### 1. Container starten
```bash
docker-compose down
docker-compose up -d

# Snapserver sollte jetzt laufen
docker logs audio2lox | grep -i snapcast
```

### 2. Auf Unraid Host: Snapclient installieren + starten

```bash
# SSH zu Unraid, dann:
apt-get update
apt-get install -y snapclient

# Starten und mit Container verbinden (IP anpassen!)
snapclient -h 192.168.10.215 -p 1704 &
```

### 3. Zone in Loxone konfigurieren

Im lox-audioserver Admin-GUI:
1. **Zones** → "Music Zone" erstellen
2. **Default Output**: Snapcast
3. **Client ID** (oder MAC): Von `snapclient` Status (z.B. `01:23:45:67:89:AB`)
4. **Speichern**

Alternativ Machine ID aus dem Container logs:
```bash
docker logs audio2lox | grep -i snapcast | grep client
```

### 4. Spotify Connect testen

1. Öffne Spotify App auf Handy/Desktop
2. Klick auf "Geräte verfügbar "
3. "Audio2Lox" oder "audio2lox" sollte erscheinen
4. Musik abspielen!

## Troubleshooting

### Snapclient verbindet nicht
```bash
# Auf Unraid prüfen
snapclient -l   # Liste alle verfügbaren Server
snapclient -h 192.168.10.215 -p 1704 -v  # Mit Verbose
```

### Keine Zone-Ausgabe  
```bash
# Container logs prüfen
docker logs audio2lox | tail -50 | grep -i "snapcast\|zone"

# Snapcast Server Status
docker exec audio2lox snapctl info
```

### Spotify Connect erscheint nicht
```bash
#  Container muss erreichbar sein auf Port 7090
# Teste:
curl http://192.168.10.215:7090/admin

# Spotify muss Netzwerk erreichen können
```

## USB Relay Integration (Optional)

PowerManager kann die USB-Soundkarte/Amplifier schalten:

```yaml
environment:
  PM_ENABLED: "true"
  PM_USB_PORT: "/dev/hidraw0"
  PM_CHANNEL: "1"
  PM_TURN_ON_AT_PLAY: "true"    # Amplifier an bei Musik
  PM_TURN_OFF_DELAY: "5"      # Abschalten nach 5 Sekunden Pause
```

## Mehrere Zonen (Multiroom)

Für mehrere Räume:

1. **Zone 1 (Living Room)**: 
   - Snapclient A (192.168.x.y)
   - Spotify + Loxone capable

2. **Zone 2 (Schlafzimmer)**:
   - Snapclient B (192.168.x.z)
   - Separate Loxone Config

Alle Clients verbinden sich zum gleichen Snapserver im Container - perfekte Audio-Synchronisation!

## Performance Notes

- **Latenz**: ~100-200ms (Snapcast standard)
- **Bandbreite**: ~320 kbps (FLAC 16bit/44.1kHz)
- **Spotify bitrate**: Auto best quality available

## Files zu prüfen

- Container logs: `docker logs audio2lox`
- Snapserver config: `/etc/snapserver.conf` (default im Container)
- Zone config: Im Admin UI unter /admin/
