# Audio2Lox - Loxone Audio Server with PowerManager

Modern TypeScript implementation of the **Loxone Audio Server** with integrated **PowerManager** USB Relay control for integrated amplifier management.

## 🎵 Features

### Core Audio Features
- **Multi-zone audio playback** with per-zone configuration
- **Radio support** backed by TuneIn
- **Custom radio stream management**
- **Local music library** with file storage and network drive support
- **Per-zone recents and favorites**
- **Multi-account Spotify support**
- **Alert engine** with TTS (Text-to-Speech)

### Audio Inputs
- Spotify Connect
- AirPlay
- Line-in
- SqueezeLight/SlimProto
- SendSpin
- Google Cast
- Sonos

### Bridge Providers
- Apple Music
- Music Assistant
- Home Assistant

### 🔌 PowerManager (NEW!)
- **USB Relay Control** via ARCELI SRD-05VDC-SL-C module
- Automatic amplifier turn-on during playback
- Configurable delay for relay turn-off
- Per-zone relay management
- Environmental variable configuration

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)
```bash
# Clone and navigate
git clone https://github.com/YOUR_USERNAME/Audio2Lox.git
cd Audio2Lox

# Start
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 2: Docker Run
```bash
docker run -d \
  --name audio2lox \
  --network host \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/data:/app/data \
  -e PM_ENABLED=true \
  -e PM_USB_PORT=/dev/ttyUSB0 \
  --device /dev/snd:/dev/snd \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  YOUR_DOCKERHUB_USERNAME/audio2lox:latest
```

### Option 3: Local Installation
```bash
# Prerequisites: Node.js 20+, npm

# Install and build
npm install
npm run build

# Start
npm start
```

## ⚙️ Configuration

### PowerManager Setup

Set environment variables before starting:

```yaml
# USB Relay Configuration
PM_ENABLED: "true"              # Enable PowerManager
PM_USB_PORT: "/dev/ttyUSB0"    # Serial port (check: ls /dev/ttyUSB*)
PM_USB_BAUD_RATE: "9600"       # ARCELI baud rate
PM_CHANNEL: "1"                 # Relay channel (1-8)
PM_TURN_ON_AT_PLAY: "true"     # Turn on when music starts
PM_TURN_OFF_DELAY: "5"         # Delay (seconds) before turning off
```

### Initial Setup

1. Open Admin UI: `http://<your-server-ip>:7090`
2. Follow guided setup wizard
3. Add Audio Server in Loxone Config
4. Configure zones and audio outputs
5. Pair with Loxone Miniserver

## 📋 Requirements

- **Docker & Docker Compose** (recommended)
- OR **Node.js 20+** with npm
- Ports `7090`, `7091`, `7095` available
- USB Audio Device (optional)
- ARCELI USB Relay (optional, for PowerManager)

## 🔧 Development

### Build from Source
```bash
npm install
npm run build
npm start
```

### Watch Mode (Development)
```bash
npm install
npm run watch
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## 📝 Environment Variables

See `.env.example` for complete list.

Key variables:
- `PM_ENABLED` - Enable PowerManager
- `PM_USB_PORT` - Serial port for relay
- `PM_USB_BAUD_RATE` - Serial baud rate
- `PM_CHANNEL` - Relay channel
- `NODE_ENV` - Environment (production/development)
- `LOG_LEVEL` - Logging level

## 🐛 Troubleshooting

### USB Relay not connecting
```bash
# Check if device is visible
ls -la /dev/ttyUSB*

# Test connection
screen /dev/ttyUSB0 9600
```

### Soundcard not detected
```bash
# List audio devices
aplay -l
arecord -l
```

### Docker logs
```bash
docker-compose logs -f lox-audioserver
```

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Detailed GitHub → DockerHub → Unraid setup
- [Setup Checklist](./SETUP_CHECKLIST.txt) - Step-by-step verification
- [PowerManager Docs](./POWERMANAGER_README.md) - USB Relay configuration

## 🤝 Contributing

Contributions welcome! Please follow:
- TypeScript strict mode
- ESLint rules (`npm run lint`)
- Commit message format (commitlint)

## 📄 License

Apache License 2.0 - See [LICENSE](./LICENSE) file

## 🙏 Credits

Based on [lox-audioserver](https://github.com/rudyberends/lox-audioserver) by Rudy Berends

PowerManager implementation by: YOUR_NAME

---

**Questions?** Open an issue in the repository!
