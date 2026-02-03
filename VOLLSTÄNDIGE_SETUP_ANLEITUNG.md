# 🚀 Vollständige Schritt-für-Schritt Einrichtung

## Phase 1: Linux-Installation

### Welche Distro?

**Empfehlung: Ubuntu Server 24.04 LTS** (bestes Balance)
- Stabil, langfristiger Support (bis 2029)
- Großes Community
- Docker einfach zu installieren
- Gute Hardwareunterstützung

**Alternative (falls schwächere Hardware):**
- Debian 12
- Raspberry Pi OS (falls auf RPi)

### Hardware-Anforderungen (Minimum):
- CPU: 2 Kerne (empfohlen: 4)
- RAM: 2GB (empfohlen: 4+GB)
- Speicher: 20GB SSD mindestens (für OS + Docker + Musik)
- USB: Für Soundcard + USB-Relais

---

## Schritt 1: Ubuntu Server installieren

### 1.1 USB-Stick vorbereiten (von Windows aus)

1. Download Ubuntu Server 24.04 LTS ISO:
   https://ubuntu.com/download/server

2. USB-Stick brennen (Windows):
   - Nutze: **Rufus** (https://rufus.ie)
   - ISO: Ubuntu Server 24.04
   - USB-Stick auswählen (⚠️ Daten werden gelöscht!)
   - "Start" klicken

### 1.2 Von USB-Stick booten

1. PC ausschalten
2. USB-Stick einstecken
3. PC einschalten, sofort F12, DEL oder ESC drücken (Boot-Menu)
4. USB-Stick wählen
5. Ubuntu Installer startet

### 1.3 Installation durchführen

```
1. Language: English wählen
2. Keyboard Layout: German (QWERTZ)
3. Network: DHCP (automatisch IP)
4. Storage: 
   - "Use an entire disk" 
   - Festplatte wählen ⚠️ (RICHTIGE PLATTE!)
   - "Done"
5. Profile Setup:
   - Your name: z.B. "Audio Server"
   - Your server's name: z.B. "audio-server"
   - Username: z.B. "audiouser"
   - Password: Starkes PW setzen!
6. OpenSSH: 
   - [X] Install OpenSSH server (wir brauchen Remote-Zugriff!)
7. Fertig stellen und Neustarten
```

---

## Schritt 2: Nach der Installation

### 2.1 Anmelden und Update machen

```bash
# Anmelden mit deinem Username/Password

# System updaten
sudo apt update
sudo apt upgrade -y

# Neustart falls nötig
sudo reboot
```

### 2.2 Wichtige Tools installieren

```bash
sudo apt install -y \
  curl \
  git \
  wget \
  htop \
  nano
```

---

## Schritt 3: Docker installieren

### 3.1 Docker + Docker Compose

```bash
# Docker Repository hinzufügen
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installieren
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Aktueller User darf Docker nutzen
sudo usermod -aG docker $USER
newgrp docker
```

### 3.2 Test
```bash
docker --version
docker run hello-world
```

---

## Schritt 4: Node.js + lox-audioserver installieren

### 4.1 Node.js installieren (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4.2 Git Repository clonen

```bash
# Ins Home-Verzeichnis gehen
cd ~

# Repository clonen
git clone https://github.com/TheNightmareX50/lox-audioserver-beta.git
cd lox-audioserver-beta
```

### 4.3 Dependencies installieren

```bash
npm install
```

---

## Schritt 5: Hardware einrichten

### 5.1 USB-Soundcard finden

```bash
# Soundcards auflisten
arecord -l
aplay -l

# Oder detaillierter:
lsusb
```

**Output Beispiel:**
```
**** List of PLAYBACK Hardware Devices ****
card 0: Loopback [Loopback], device 0: Loopback PCM [Loopback PCM]
card 1: USBDAC [USB Audio DAC], device 0: USB Audio [USB Audio]
```

→ **card 1** ist deine USB-Soundcard

### 5.2 USB-Relais finden

```bash
# USB-Geräte auflisten
ls -la /dev/ttyUSB*
```

**Output Beispiel:**
```
crw-rw---- 1 root dialout 188, 0 Feb  2 10:45 /dev/ttyUSB0
```

→ **ttyUSB0** ist dein USB-Relais

### 5.3 Berechtigungen setzen

```bash
# Soundcard
sudo usermod -aG audio $USER

# USB-Relais (dialout group)
sudo usermod -aG dialout $USER

# Dann abmelden und wieder anmelden
exit
# Wieder anmelden...
```

---

## Schritt 6: docker-compose.yml konfigurieren

### 6.1 Datei öffnen und anpassen

```bash
nano docker-compose.yml
```

### 6.2 Diese Zeilen NACH `cap_add:` einfügen:

```yaml
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
```

**Speichern:** Ctrl+O → Enter → Ctrl+X

### 6.3 Falls Relais auf ttyUSB1:
```yaml
PM_USB_PORT: "/dev/ttyUSB1"
```

---

## Schritt 7: Build und Start

### 7.1 TypeScript kompilieren

```bash
npm run build
```

### 7.2 Docker Container starten

```bash
docker-compose up -d
```

### 7.3 Logs prüfen

```bash
docker-compose logs -f lox-audioserver
```

**Sollte zeigen:**
```
[PowerManagement] USB Relais connected ✅
```

---

## Schritt 8: Loxone konfigurieren

### 8.1 Audio Server als Gerät hinzufügen

In Loxone Config:
1. Geräte → Netzwerk → Musik
2. **Neues Gerät hinzufügen**
3. Typ: **Musik Server** (oder "Audio Server")
4. IP: `<IP-des-PCs>` (z.B. 192.168.1.100)
5. Port: `7090`
6. **Verbinden testen**

### 8.2 Zones konfigurieren

Im lox-audioserver:
1. Web-Interface öffnen: `http://<PC-IP>:7090`
2. Zones → Neue Zone erstellen
3. Für jedes Zimmer:
   - Name: z.B. "Wohnzimmer"
   - Output-Type: SqueezeLight (falls Squeezelite läuft)
   - Relais-Channel: Passend zur Hardware

---

## Schritt 9: Test machen

### 9.1 Relais-Test

```bash
# Im PC (SSH oder lokal):
docker exec lox-audioserver npm run test:relay
```

**Sollte hörbar klicken!**

### 9.2 Music Assistant Integration (optional)

In Music Assistant:
1. Settings → Providers
2. **Loxone hinzufügen**
3. IP: `<PC-IP>`
4. Port: `7090`
5. **Verbinden**

---

## Checkliste

```
Phase 1: Linux
  ☐ Ubuntu Server 24.04 installiert
  ☐ System updated
  
Phase 2: Docker
  ☐ Docker installiert
  ☐ docker run hello-world funktioniert
  
Phase 3: lox-audioserver
  ☐ Repository geclont
  ☐ npm install erfolgreich
  ☐ npm run build kompiliert
  
Phase 4: Hardware
  ☐ USB-Soundcard erkannt (aplay -l)
  ☐ USB-Relais erkannt (ls /dev/ttyUSB*)
  ☐ Berechtigungen gesetzt
  
Phase 5: Docker starten
  ☐ docker-compose.yml angepasst
  ☐ docker-compose up -d erfolgreich
  ☐ Logs zeigen "USB Relais connected"
  
Phase 6: Integration
  ☐ Loxone verbunden
  ☐ Musik läuft
  ☐ Relais schaltet (hörbar!)
```

---

## Häufige Probleme

### ❌ "Permission denied" bei Docker

**Lösung:**
```bash
sudo usermod -aG docker $USER
newgrp docker
exit  # Abmelden
# Wieder anmelden
```

### ❌ USB-Gerät nicht sichtbar

```bash
# Alle USB-Geräte auflisten
lsusb

# Details anschauen
dmesg | tail -20
```

### ❌ Relais wird nicht erkannt

```bash
# Serielle Verbindung testen
screen /dev/ttyUSB0 9600

# Oder mit Minicom
minicom -D /dev/ttyUSB0 -b 9600
```

Ctrl+A dann Q zum Beenden

### ❌ Soundcard wird nicht erkannt

```bash
# Berechtigungen nochmal setzen
sudo usermod -aG audio $USER
sudo usermod -aG pulse $USER
sudo usermod -aG pulse-access $USER

# Logout und Login
exit
```

---

## Remote-Zugriff (SSH)

Von deinem Windows-PC:

```powershell
# In PowerShell:
ssh audiouser@<IP-DES-LINUX-PCs>
```

Oder nutze **PuTTY** (graphisch):
- Download: https://www.putty.org
- Host: `<IP>`
- User: `audiouser`
- Speichern & Connect

---

## Weitere Tipps

### Statische IP setzen

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

Ändern zu:
```yaml
network:
  ethernets:
    eth0:
      dhcp4: no
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
  version: 2
```

Dann:
```bash
sudo netplan apply
```

### Auto-Restart bei Boot

```bash
# Damit Container bei Neustart automatisch startet:
docker-compose up -d

# Oder mit systemd (erweiterte Option)
sudo nano /etc/systemd/system/lox-audioserver.service
```

---

**🎉 FERTIG! Ab hier läuft dein Audio-System!**

Bei Fragen: Schau in die Logs!
```bash
docker-compose logs -f
```
