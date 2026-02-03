# 🚀 Audio2Lox Deployment Guide

## Setup für GitHub → DockerHub → Unraid

---

## Schritt 1: GitHub Setup (EINMALIG)

### 1.1 GitHub Secrets konfigurieren

1. Gehe zu deinem Repository auf GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Füge folgende Secrets hinzu:

| Name | Value |
|------|-------|
| `DOCKERHUB_USERNAME` | Dein DockerHub Username |
| `DOCKERHUB_TOKEN` | Dein DockerHub Personal Access Token |

**DockerHub Token generieren:**
1. https://hub.docker.com/settings/security
2. **New Access Token**
3. Name: `github-actions`
4. Permissions: Read, Write, Delete
5. **Generate**
6. Token kopieren und in GitHub Secret einfügen

### 1.2 Workflow aktivieren

GitHub Actions sollte bereits aktiviert sein.
Prüfe unter: **Actions** Tab im Repository

---

## Schritt 2: Dateien vorbereiten

Diese Dateien sind bereits vorhanden und müssen NUR noch in dein echtes GitHub Repository kopiert werden:

```
.github/
  └── workflows/
       └── docker-publish.yml
.dockerignore
Dockerfile
docker-compose.yml
.env.example
```

### 2.1 USERNAME ersetzen

Ersetze überall `YOUR_DOCKERHUB_USERNAME` mit deinem echten DockerHub Username:

**In diesen Dateien:**
- `docker-compose.yml` (Zeile ~7)
- `.github/workflows/docker-publish.yml` (Zeile ~9)

**Beispiel:**
```yaml
# Vorher:
image: YOUR_DOCKERHUB_USERNAME/lox-audioserver:latest

# Nachher:
image: nightmarex50/lox-audioserver:latest
```

---

## Schritt 3: GitHub Push

```powershell
# Im lox-audioserver-beta Verzeichnis (oder deinem Repo-Verzeichnis):

# Stelle sicher dass alles aktuell ist
git status

# Alle neuen Dateien hinzufügen
git add Dockerfile .dockerignore docker-compose.yml .github/ .env.example

# Commit
git commit -m "Add Docker configuration and GitHub Actions workflow"

# Push zu GitHub
git push origin main
```

---

## Schritt 4: Docker Build starten

Der Build läuft automatisch, wenn du pushst!

**Prüfen unter:**
1. GitHub Repository → **Actions** Tab
2. Workflow: "Build and Push Docker Image"
3. Watch the build progress

**Sollte ~5-10 Minuten dauern**

---

## Schritt 5: Unraid Deployment

### 5.1 SSH zu Unraid

```bash
ssh root@<DEIN_UNRAID_IP>
```

### 5.2 Verzeichnis vorbereiten

```bash
mkdir -p /mnt/user/appdata/Audio2Lox
cd /mnt/user/appdata/Audio2Lox

# Config Verzeichnisse erstellen
mkdir -p config logs data
```

### 5.3 docker-compose.yml downloaden

```bash
# Erste Option: Von GitHub downloaden
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/docker-compose.yml

# Oder: Manuell copieren aus diesem Verzeichnis
nano docker-compose.yml
# Paste inhalt, Ctrl+O, Enter, Ctrl+X
```

### 5.4 USERNAME überprüfen und aktualisieren

```bash
nano docker-compose.yml
```

Suche und ersetze `YOUR_DOCKERHUB_USERNAME` mit deinem echten Username!

### 5.5 USB Ports überprüfen

```bash
# Schau wo deine Geräte sind:
ls -la /dev/ttyUSB*
ls -la /dev/snd/

# Falls dein Relais auf ttyUSB1 statt ttyUSB0:
# -> docker-compose.yml aktualisieren
```

### 5.6 Container starten

```bash
cd /mnt/user/appdata/Audio2Lox

# Image pullen (vom DockerHub)
docker-compose pull

# Container starten
docker-compose up -d

# Logs anschauen
docker-compose logs -f
```

**Erfolgreich wenn du siehst:**
```
[PowerManagement] USB Relais connected ✅
```

---

## 🔄 Updates deployen (später)

**Auf deinem PC (Windows):**
```powershell
git add .
git commit -m "Update XYZ"
git push
```

**Auf Unraid (5-10 Min später, nach automatischem Build):**
```bash
cd /mnt/user/appdata/Audio2Lox
docker-compose pull
docker-compose down
docker-compose up -d
docker-compose logs -f
```

---

## ✅ Checkliste

```
GitHub Setup:
  ☐ Repository erstellt
  ☐ Secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN) eingetragen
  
Dateien vorbereiten:
  ☐ USERNAME in docker-compose.yml ersetzt
  ☐ USERNAME in .github/workflows/docker-publish.yml ersetzt
  
GitHub Push:
  ☐ Dateien zu git hinzugefügt
  ☐ git push erfolgreich
  ☐ Actions Tab zeigt "Build and Push" Workflow
  
DockerHub:
  ☐ Build erfolgreich (grünes Häkchen in Actions)
  ☐ Image auf DockerHub sichtbar
  
Unraid:
  ☐ SSH funktioniert
  ☐ Verzeichnis /mnt/user/appdata/Audio2Lox erstellt
  ☐ docker-compose.yml runtergeladen/kopiert
  ☐ USB Ports überprüft
  ☐ Container started: docker-compose up -d
  ☐ Logs OK: "USB Relais connected"
```

---

## 🚨 Häufige Fehler

### ❌ "GitHub Actions secret not found"
→ Secrets nicht korrekt eingetragen
→ Gehe zu: Settings → Secrets and variables → Actions
→ Prüfe die Namen: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

### ❌ "Build failed: access denied"
→ Secrets existieren, aber sind leer
→ Regeneriere DockerHub Token
→ Aktualisiere GitHub Secrets

### ❌ "image not found on docker.io"
→ Build ist noch nicht fertig (Wait 10 minutes)
→ ODER: USERNAME stimmt nicht
→ Prüfe: docker-compose.yml und docker-publish.yml

### ❌ "Cannot connect to /dev/ttyUSB0"
→ Relais nicht angesteckt?
→ Check auf Unraid: `ls -la /dev/ttyUSB*`
→ Falls auf ttyUSB1: docker-compose.yml aktualisieren

### ❌ "Permission denied: /dev/snd"
→ Soundcard Permissions Problem
→ Auf Unraid: `sudo chmod 666 /dev/snd/*`

---

**🎉 Fertig! Automatisches Deployment ist live!**

Jede Änderung die du pusht → Wird automatisch gebaut → Läuft auf Unraid!
