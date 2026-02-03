# 📋 Alle Befehle zum Kopieren & Einfügen

Einfach die Befehle nacheinander in dein Ubuntu-Terminal kopieren!

---

## 1️⃣ Docker installieren

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

```bash
sudo apt update
```

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Test:**
```bash
docker --version
docker run hello-world
```

---

## 2️⃣ Node.js installieren

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

```bash
sudo apt install -y nodejs
```

**Test:**
```bash
node --version
npm --version
```

---

## 3️⃣ lox-audioserver clonen & installieren

```bash
cd ~
```

```bash
git clone https://github.com/TheNightmareX50/lox-audioserver-beta.git
```

```bash
cd lox-audioserver-beta
```

```bash
npm install
```

---

## 4️⃣ Hardware überprüfen

**Soundcard anzeigen:**
```bash
aplay -l
```

**USB-Relais anzeigen:**
```bash
ls -la /dev/ttyUSB*
```

---

## 5️⃣ Berechtigungen setzen

```bash
sudo usermod -aG audio $USER
```

```bash
sudo usermod -aG dialout $USER
```

```bash
sudo usermod -aG pulse $USER
```

**Dann abmelden und wieder anmelden (oder neu booten):**
```bash
exit
```

---

## 6️⃣ docker-compose.yml bearbeiten

```bash
nano docker-compose.yml
```

**Folgende Zeilen NACH `cap_add:` einfügen:**

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

**Speichern & beenden:**
- `Ctrl + O`
- `Enter`
- `Ctrl + X`

---

## 7️⃣ Build und Start

```bash
npm run build
```

```bash
docker-compose up -d
```

**Logs anschauen:**
```bash
docker-compose logs -f lox-audioserver
```

---

## 8️⃣ Testen

**Relais verbunden?**
```bash
docker-compose logs lox-audioserver | grep -i "usb\|power\|relais"
```

**Container läuft?**
```bash
docker-compose ps
```

**Alle Logs:**
```bash
docker-compose logs -f
```

---

## ✅ Checkliste für Erfolg

```bash
# 1. Docker funktioniert?
docker ps

# 2. lox-audioserver läuft?
docker-compose ps

# 3. Soundcard da?
aplay -l

# 4. USB-Relais da?
ls /dev/ttyUSB*

# 5. Logs OK?
docker-compose logs lox-audioserver | tail -20
```

---

## 🔧 Häufig gebraucht

**Container stoppen:**
```bash
docker-compose down
```

**Container neu starten:**
```bash
docker-compose restart lox-audioserver
```

**Alles neustarten (nach änderungen):**
```bash
docker-compose down
docker-compose up -d
docker-compose logs -f
```

**Logs löschen (für frischen Start):**
```bash
docker-compose logs --tail 0
```

---

## 🌐 Web-Interface öffnen

Von deinem Windows-PC im Browser:
```
http://<IP-DES-UBUNTU-PCs>:7090
```

Oder über SSH deine IP anschauen:
```bash
hostname -I
```

---

**FERTIG! Alle Befehle einfach der Reihe nach eingeben! 🚀**
