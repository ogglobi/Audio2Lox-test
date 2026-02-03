# 📚 Audio2Lox - Loxone Audio Server with PowerManager USB Relay

**Complete production-ready package for Docker deployment on Unraid**

---

## 📂 Repository Structure

```
Audio2Lox/
├── .github/
│   └── workflows/
│       └── docker-publish.yml         ← GitHub Actions (Auto Docker Build to DockerHub)
├── src/                               ← TypeScript source code (copied from lox-audioserver)
│   ├── server.ts                      ← Main entry point
│   ├── adapters/                      ← Output adapters (Spotify, AirPlay, SqueezeLight, etc.)
│   ├── application/                   ← Application logic
│   ├── domain/                        ← Domain models
│   ├── ports/                         ← HTTP/WebSocket port handlers
│   └── ...
├── scripts/
│   └── fetch-admin-dist.mjs           ← Fetch admin UI (build script)
├── public/                            ← Static web files
├── tests/                             ← Test files
├── .dockerignore                      ← Files excluded from Docker image
├── .editorconfig                      ← Editor settings
├── .env.example                       ← Environment variables template
├── .gitignore                         ← Git ignore rules
├── Dockerfile                         ← Multi-stage Docker build
├── docker-compose.yml                 ← Unraid deployment configuration
├── eslint.config.js                   ← Linting rules
├── prettier.config.cjs                ← Code formatting
├── package.json                       ← Dependencies + build scripts
├── tsconfig.json                      ← TypeScript configuration
├── tsc-alias.json                     ← TypeScript path aliases
├── nodemon.json                       ← Development watch config
├── .dependency-cruiser.cjs            ← Dependency check config
├── LICENSE                            ← Apache 2.0 License
├── README.md                          ← This file
├── DEPLOYMENT_GUIDE.md                ← Detailed setup instructions
├── SETUP_CHECKLIST.txt                ← Step-by-step checklist
└── GITHUB_DOCKERHUB_UNRAID_ANLEITUNG.md  ← German setup guide
```

---

## 🚀 Quick Start

### Prerequisites
- GitHub account + DockerHub account (free)
- Unraid server with Docker
- SSH access to Unraid

### 5-Minute Setup

#### 1. GitHub Secrets (Einmalig)
```
Settings → Secrets and variables → Actions
DOCKERHUB_USERNAME = your-username
DOCKERHUB_TOKEN = your-token (from hub.docker.com/settings/security)
```

#### 2. Replace Username
In `docker-compose.yml` and `.github/workflows/docker-publish.yml`:
```
YOUR_DOCKERHUB_USERNAME → your-actual-username
```

#### 3. Push to GitHub
```powershell
git add .
git commit -m "Initial Audio2Lox deployment"
git push origin main
```

#### 4. Unraid Deployment
```bash
# SSH to Unraid
ssh root@your-unraid-ip

# Create directory
mkdir -p /mnt/user/appdata/Audio2Lox
cd /mnt/user/appdata/Audio2Lox

# Get docker-compose.yml
wget https://raw.githubusercontent.com/YOUR_USERNAME/Audio2Lox/main/docker-compose.yml

# Start (after automatic Docker build finishes ~10 min)
docker-compose pull
docker-compose up -d
docker-compose logs -f
```

---

## 🔧 Configuration

### PowerManager Environment Variables

```yaml
PM_ENABLED: "true"              # Enable USB relay control
PM_USB_PORT: "/dev/ttyUSB0"    # Serial port (check: ls /dev/ttyUSB*)
PM_USB_BAUD_RATE: "9600"       # ARCELI baud rate (don't change)
PM_CHANNEL: "1"                 # Relay channel 1-8
PM_TURN_ON_AT_PLAY: "true"     # Turn on when music starts
PM_TURN_OFF_DELAY: "5"         # Seconds before turning off
```

### All Environment Variables

See `.env.example` for complete list including:
- PowerManager settings
- Node.js configuration
- Logging levels
- Loxone credentials (optional)

---

## 🔄 CI/CD Workflow

### Automatic Deployment Pipeline

```
Your PC                GitHub                 DockerHub              Unraid
  ↓                      ↓                        ↓                     ↓
git push ────→  GitHub Actions     ────→   Automatic Build   ──→  docker-compose pull
              (docker-publish.yml)    (5-10 min)            (latest image)
                Build Docker Image
                Push to DockerHub
```

### Manual Workflow

1. **Develop locally** - Make changes, test
2. **Commit & Push** - `git push origin main`
3. **GitHub builds** - Actions workflow starts automatically
4. **Update Unraid** - Pull new image and restart

---

## 📖 Documentation Files

- **README.md** - This overview
- **DEPLOYMENT_GUIDE.md** - Detailed step-by-step setup with troubleshooting
- **SETUP_CHECKLIST.txt** - Verification checklist for each phase
- **.env.example** - All available environment variables
- **GITHUB_DOCKERHUB_UNRAID_ANLEITUNG.md** - German version

---

## 🛠️ Development

### Local Build & Test

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run watch

# Build TypeScript
npm run build

# Start server
npm start

# Lint code
npm run lint

# Run tests
npm test
```

### Docker Build Locally

```bash
# Build image
docker build -t audio2lox:test .

# Run container
docker run -d \
  --name audio2lox-test \
  --network host \
  -v $(pwd)/config:/app/config \
  -e PM_ENABLED=true \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  audio2lox:test

# Check logs
docker logs -f audio2lox-test
```

---

## 🔍 Troubleshooting

### GitHub Actions Fails
- Check Secrets in Settings
- Verify USERNAME in docker-publish.yml
- Check GitHub Actions logs under Actions tab

### Docker Build Fails
- Ensure secrets are set correctly
- Check repository is PUBLIC
- Wait 5-10 minutes for build to complete

### Container Won't Start
```bash
# Check logs
docker-compose logs -f

# Verify USB ports
ls -la /dev/ttyUSB*

# Check audio devices
aplay -l
```

### USB Relay Not Detected
```bash
# Test serial connection
screen /dev/ttyUSB0 9600

# Check permissions
sudo usermod -aG dialout $USER
```

---

## 📊 Performance

- **Image Size**: ~300-400MB
- **RAM Usage**: 400-600MB (base), +100MB per zone
- **CPU**: Minimal (event-driven)
- **Startup Time**: 10-15 seconds

---

## 🔐 Security

- Non-root container user
- Read-only where possible
- No hardcoded secrets (use environment variables)
- Proper logging without sensitive data

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Follow ESLint rules: `npm run lint`
5. Commit with clear messages
6. Push and create Pull Request

---

## 📄 License

Apache License 2.0 - See [LICENSE](./LICENSE)

Based on [lox-audioserver](https://github.com/rudyberends/lox-audioserver) by Rudy Berends

---

## 🆘 Support

- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed help
- Review [SETUP_CHECKLIST.txt](./SETUP_CHECKLIST.txt) for verification
- Check Docker logs: `docker-compose logs -f`
- Open issue on GitHub with logs and details

---

**Ready to deploy!** 🚀

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.
