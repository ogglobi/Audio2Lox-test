# 🚀 Deploy über GitHub + DockerHub zu Unraid

Much besser als local installieren! So funktioniert's:

---

## Was braucht ihr?

- ✅ GitHub Account (kostenlos: https://github.com/signup)
- ✅ DockerHub Account (kostenlos: https://hub.docker.com/signup)
- ✅ Unraid Server (mit Docker-Support)

---

## Phase 1: GitHub Setup (Windows PC)

### 1.1 Neues Repository erstellen

1. Gehe zu https://github.com/new
2. **Repository name:** `lox-audioserver` (oder wie du willst)
3. **Description:** "Loxone Audio Server with PowerManager"
4. **Public** (damit DockerHub drankommen kann)
5. **Create repository**

### 1.2 Lokales Repo uploaden (auf deinem Windows PC)

Öffne PowerShell **im lox-audioserver-beta Verzeichnis:**

```powershell
cd "C:\Zwischenspeicher\VSCode Workfolder\wip\lox-audioserver-beta"
```

Dann:

```powershell
git init
git add .
git commit -m "Initial commit: PowerManager + USB Relay implementation"
git branch -M main
git remote add origin https://github.com/DEIN_USERNAME/lox-audioserver.git
git push -u origin main
```

**Ersetze `DEIN_USERNAME` mit deinem echten GitHub-Username!**

Falls Authentifizierung gefragt wird:
- **Nutzer:** Dein GitHub Username
- **Passwort:** Dein GitHub Personal Access Token
  - Generieren unter: https://github.com/settings/tokens
  - Scope: `repo`, `read:packages`, `write:packages`

---

## Phase 2: Dockerfile vorbereiten

### 2.1 Dockerfile erstellen

Erstelle neue Datei in Windows: `lox-audioserver-beta\Dockerfile`

```dockerfile
# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime Stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    alsa-lib \
    pulseaudio \
    ca-certificates

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 7090 7091 7095

CMD ["node", "dist/server.js"]
```

Speichern & zu Git hinzufügen:

```powershell
git add Dockerfile
git commit -m "Add Dockerfile for DockerHub build"
git push
```

---

## Phase 3: DockerHub Setup

### 3.1 Repository auf DockerHub erstellen

1. Gehe zu https://hub.docker.com/repositories
2. **Create** → **Create repository**
3. **Name:** `lox-audioserver`
4. **Visibility:** Public
5. **Create**

### 3.2 Auto-Build vom GitHub aktivieren

Auf deinem DockerHub Repository:

1. **Builds** Tab
2. **Link to GitHub**
3. GitHub-Account verbinden (einmalig)
4. **Repository:** `DEIN_USERNAME/lox-audioserver`
5. **Build rules:**
   - **Source:** `main`
   - **Docker Tag:** `latest`
   - **Dockerfile location:** `Dockerfile`
6. **Save and build**

→ DockerHub baut automatisch bei jedem Git-Push! 🎉

---

## Phase 4: Unraid Deployment

### 4.1 SSH auf Unraid

```powershell
# Von Windows PowerShell:
ssh root@<DEIN_UNRAID_IP>
```

Oder nutze Terminal im Unraid Web-UI.

### 4.2 Verzeichnis vorbereiten

```bash
mkdir -p /mnt/user/appdata/lox-audioserver
cd /mnt/user/appdata/lox-audioserver
```

### 4.3 docker-compose.yml für Unraid erstellen

```bash
nano docker-compose.yml
```

**Inhalt:**

```yaml
version: '3.8'

services:
  lox-audioserver:
    image: DEIN_DOCKERHUB_USERNAME/lox-audioserver:latest
    container_name: lox-audioserver
    restart: unless-stopped
    
    network_mode: host
    
    devices:
      - /dev/snd:/dev/snd
      - /dev/ttyUSB0:/dev/ttyUSB0
    
    environment:
      PM_ENABLED: "true"
      PM_USB_PORT: "/dev/ttyUSB0"
      PM_USB_BAUD_RATE: "9600"
      PM_CHANNEL: "1"
      PM_TURN_ON_AT_PLAY: "true"
      PM_TURN_OFF_DELAY: "5"
    
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
```

**Speichern:** `Ctrl+O` → `Enter` → `Ctrl+X`

### 4.4 Container starten

```bash
docker-compose up -d
```

### 4.5 Logs anschauen

```bash
docker-compose logs -f lox-audioserver
```

---

## 🔄 Updates deployen (so einfach!)

**Irgendwann machst du Änderungen lokal, dann:**

```powershell
# Auf Windows PC im lox-audioserver Verzeichnis:
git add .
git commit -m "Deine Beschreibung"
git push
```

→ DockerHub baut automatisch
→ Unraid zieht das neue Image

```bash
# Auf Unraid (nach ~5-10 Min):
docker-compose pull
docker-compose down
docker-compose up -d
```

---

## 📊 Unraid Web-UI (Alternative zu CLI)

Falls du lieber graphisch magst:

1. **Docker** → **Add Container**
2. **Template:** `lox-audioserver`
3. **Repository:** `DEIN_DOCKERHUB_USERNAME/lox-audioserver`
4. **Tag:** `latest`
5. **Network Type:** `Host`
6. **Devices:**
   - `/dev/snd`
   - `/dev/ttyUSB0`
7. **Environment Variables:**
   - `PM_ENABLED=true`
   - `PM_USB_PORT=/dev/ttyUSB0`
   - etc.
8. **Apply**

---

## ✅ Checkliste

```
GitHub:
  ☐ GitHub Account erstellt
  ☐ Neues Repository erstellt
  ☐ Code hochgeladen (git push)
  ☐ Dockerfile im Repo

DockerHub:
  ☐ DockerHub Account erstellt
  ☐ Repository erstellt
  ☐ Auto-Build vom GitHub konfiguriert
  ☐ Build erfolgreich (grünes Häkchen)

Unraid:
  ☐ SSH Zugriff funktioniert
  ☐ docker-compose.yml erstellt
  ☐ Container gestartet (docker-compose up -d)
  ☐ Logs zeigen "USB Relais connected"
```

---

## 🚨 Häufige Fehler

### ❌ "Image not found"
→ Warte 10 Min, bis DockerHub fertig ist
→ Dann: `docker-compose pull`

### ❌ "Cannot connect to ttyUSB0"
→ Relais plugged in?
→ Check: `ls -la /dev/ttyUSB*` auf Unraid

### ❌ "Permission denied: /dev/snd"
→ Unraid container muss privilegiert sein (wird auto gemacht mit network_mode: host)

### ❌ Git push funktioniert nicht
→ GitHub Personal Access Token statt Passwort!
→ Generiere hier: https://github.com/settings/tokens

---

**🎉 Das war's! Jetzt läuft alles automatisiert auf Unraid!**
