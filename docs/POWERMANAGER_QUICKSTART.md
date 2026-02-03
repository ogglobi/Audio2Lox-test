## 🔌 ARCELI USB Relais - Quick Start Anleitung

Sie haben alles, was Sie brauchen! Hier sind die 4 einfachen Schritte:

---

### **Schritt 1: USB Relais mit Host verbinden**

Ihr ARCELI USB-Relais an den Linux-Host (NAS/Raspberry Pi/etc.) anschließen.

Dann den USB-Port finden:
```bash
ls -la /dev/ttyUSB*

# Beispiel-Ausgabe:
# /dev/ttyUSB0  ← Das ist Ihr Relais
```

Falls es nicht auftaucht:
```bash
# Relais-Treiber installieren (Ubuntu/Debian)
sudo apt install libserialport-dev
```

---

### **Schritt 2: docker-compose.yml anpassen**

Öffnen Sie Ihre `docker-compose.yml`:

```yaml
services:
  loxoneaudioserver:
    # ... andere Einstellungen ...
    
    # ⭐ NEUE ZEILEN HINZUFÜGEN:
    devices:
      - /dev/snd:/dev/snd          # Soundkarte
      - /dev/ttyUSB0:/dev/ttyUSB0  # ← USB Relais
    
    environment:
      # PowerManager Einstellungen
      PM_ENABLED: "true"
      PM_USB_PORT: "/dev/ttyUSB0"
      PM_USB_BAUD_RATE: "9600"
      PM_CHANNEL: "1"
      PM_TURN_ON_AT_PLAY: "true"
      PM_TURN_OFF_DELAY: "5"
      
      # ... andere env vars ...
```

**Das war's!** Der PowerManager ist konfiguriert.

---

### **Schritt 3: Container bauen & starten**

```bash
# Im lox-audioserver-beta Verzeichnis:
cd /path/to/lox-audioserver-beta

# Dependencies installieren
npm install

# Bauen
npm run build

# Mit docker-compose starten
docker-compose up -d

# Logs anschauen
docker-compose logs -f

# ✅ Erfolgreich wenn Sie sehen:
# [PowerManagement] USB Relais connected (port=/dev/ttyUSB0, baudRate=9600, channel=1)
```

Falls `serialport` Fehler kommt:
```bash
# Docker Image rebuild (um serialport zu kompilieren)
docker-compose build --no-cache
docker-compose up -d
```

---

### **Schritt 4: Testen!**

Musik in Loxone abspielen:

1. **HLoxone öffnen** oder Music Assistant
2. **Zone auswählen** → Musik spielen
3. **HÖREN:** Das Relais sollte einen Klick machen (einschalten)
4. **STOPPEN:** Nach 5 Sekunden macht es wieder Klick (ausschalten)

**Fertig!** 🎉

---

## Falls nicht funktioniert

### ❌ Fehler: "Port nicht gefunden"

```
[PowerManagement] Failed to initialize USB Relais: /dev/ttyUSB0 (ENOENT)
```

**Lösung:**
```bash
# Port überprüfen
ls -la /dev/ttyUSB*

# Wenn ttyUSB1: docker-compose.yml anpassen:
PM_USB_PORT: "/dev/ttyUSB1"
```

### ❌ Fehler: "Relais antwortet nicht"

**Überprüfung:**
```bash
# Ist serialport installiert?
npm list serialport

# USB Gerät sichtbar?
lsusb | grep -i ch340
# oder
lsusb | grep -i prolific
```

**Lösung:**
```bash
# Docker Image neu bauen
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Einstellungen anpassen

### Verzögerung ändern

Falls Ihr Verstärker schneller braucht (z.B. 2 Sekunden):

```yaml
PM_TURN_OFF_DELAY: "2"
```

Dann:
```bash
docker-compose restart
```

### Für mehrere Kanäle (Multi-Channel Relais)

Falls Sie 4 Kanäle haben und unterschiedliche Zonen steuern wollen - das braucht erweiterte Konfiguration. Melden Sie sich, wenn Sie das brauchen!

---

## Jetzt läuft's! 🎵

Viel Spaß mit der stromsparenden Multi-Room Audio! 🔌

Falls Probleme auftauchen → Logs überprüfen:
```bash
docker logs lox-audioserver | grep -i power
```
