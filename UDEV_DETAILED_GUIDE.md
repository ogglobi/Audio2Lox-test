# 🔧 UDEV-Rule Installation - Detaillierte Anleitung

## Übersicht

Mit dieser Anleitung machst du das USBRelay2 HID-Gerät zu einem seriellen Gerät, das PowerManager verwenden kann.

**Was passiert:**
- Unraid erkennt das Relais als `/dev/hidraw3`
- Mit der udev-Rule wird es auch als `/dev/ttyUSB_RELAY` verfügbar
- Docker mappt das zu `/dev/ttyUSB0` im Container
- PowerManager funktioniert sofort!

---

## 📋 Voraussetzungen

- ✅ Unraid läuft
- ✅ SSH-Zugang zu Unraid
- ✅ USBRelay2 ist angesteckt
- ✅ Docker Container lox-audioserver nicht aktiv (oder später neustarten)

---

## 🚀 SCHRITT-FÜR-SCHRITT ANLEITUNG

### SCHRITT 1: SSH auf Unraid verbinden

Öffne ein Terminal (PowerShell, Linux Terminal, MobaXterm, etc.):

```bash
ssh root@DEINE-UNRAID-IP
```

**Beispiel:**
```bash
ssh root@192.168.1.100
```

Password eingeben (dein Unraid-Admin-Passwort).

**✅ Du solltest jetzt im Unraid-Terminal sein und einen Prompt sehen wie:**
```
root@sh-hv01:~#
```

---

### SCHRITT 2: Überprüfe ob dein Relais erkannt wird

Führe aus:
```bash
lsusb | grep 16c0
```

**✅ Erwartet Output:**
```
Bus 004 Device 011: ID 16c0:05df www.dcttech.com USBRelay2
```

Falls **NICHTS** kommt → Relais ist nicht angesteckt oder nicht erkannt.
→ Relais neu anstecken und `lsusb` nochmal versuchen.

---

### SCHRITT 3: udev-Rules Verzeichnis überprüfen

```bash
ls -la /etc/udev/rules.d/
```

**✅ Erwartet:** Mehrere .rules Dateien

Falls der Ordner nicht existiert:
```bash
mkdir -p /etc/udev/rules.d/
```

---

### SCHRITT 4: udev-Rule-Datei erstellen

Jetzt erstellen wir die Rule-Datei. Es gibt 2 Optionen:

#### Option A: Mit nano (einfacher für Anfänger)

```bash
nano /etc/udev/rules.d/99-usbrelay.rules
```

Das öffnet einen Text-Editor. Kopiere jetzt **EXAKT** diese Zeilen rein:

```
# udev Rule für USBRelay2 (16c0:05df)
# Erstellt einen Symlink /dev/ttyUSB_RELAY für das HID-Gerät
SUBSYSTEMS=="usb", ATTRS{idVendor}=="16c0", ATTRS{idProduct}=="05df", SYMLINK+="ttyUSB_RELAY"
```

**Speichern:**
- Drücke `CTRL + X`
- Dann `Y` (für Yes)
- Dann `ENTER` (um Dateiname zu bestätigen)

#### Option B: Mit cat (schneller copy-paste)

Alternativ einfach diesen Befehl ausführen:

```bash
cat > /etc/udev/rules.d/99-usbrelay.rules << 'EOF'
# udev Rule für USBRelay2 (16c0:05df)
# Erstellt einen Symlink /dev/ttyUSB_RELAY für das HID-Gerät
SUBSYSTEMS=="usb", ATTRS{idVendor}=="16c0", ATTRS{idProduct}=="05df", SYMLINK+="ttyUSB_RELAY"
EOF
```

---

### SCHRITT 5: Überprüfe dass die Datei richtig erstellt wurde

```bash
cat /etc/udev/rules.d/99-usbrelay.rules
```

**✅ Output sollte sein:**
```
# udev Rule für USBRelay2 (16c0:05df)
# Erstellt einen Symlink /dev/ttyUSB_RELAY für das HID-Gerät
SUBSYSTEMS=="usb", ATTRS{idVendor}=="16c0", ATTRS{idProduct}=="05df", SYMLINK+="ttyUSB_RELAY"
```

Falls nicht richtig → Nochmal versuchen oder Datei mit nano editieren.

---

### SCHRITT 6: udev-Rules neu laden

```bash
udevadm control --reload-rules
```

Keine Fehlermeldung = ✅ Gut!

---

### SCHRITT 7: udev-Regeln anwenden (WICHTIG!)

Trigger ist notwendig damit die Rule aktiv wird:

```bash
udevadm trigger
```

---

### SCHRITT 8: Relais aus- und wieder einstecken

**Das ist der WICHTIGSTE Schritt!** Die udev-Rule wird erst angewendet, wenn das Gerät erkannt wird.

1. **Relais ausstecken** (von USB-Port entfernen)
2. **Warten** ~2 Sekunden
3. **Relais wieder einstecken**

---

### SCHRITT 9: Überprüfe ob der Symlink existiert

```bash
ls -la /dev/ttyUSB_RELAY
```

**✅ PERFEKT! Output sollte sein:**
```
lrwxrwxrwx 1 root root 13 Feb  5 21:30 /dev/ttyUSB_RELAY -> hidraw3
```

Das `-> hidraw3` zeigt dass es auf das richtige HID-Gerät zeigt.

**❌ Falls Fehler: "No such file or directory"**
→ Gehe zu **Troubleshooting** (unten)

---

### SCHRITT 10: Überprüfe mit dmesg

```bash
dmesg | tail -10
```

**✅ Du solltest sehen:**
```
[4829628.908056] hid-generic 0003:16C0:05DF.0007: hiddev98,hidraw3: USB HID v1.01 Device [www.dcttech.com USBRelay2] on usb-0000:07:00.3-3.1/input0
```

Das bestätigt dass dein Relais erkannt wurde.

---

## 🐳 SCHRITT 11: docker-compose.yml aktualisieren

Jetzt muss die docker-compose.yml für dein Projekt aktualisiert werden.

**Auf deinem lokalen Computer (oder Unraid):**

Öffne `/pfad/zu/lox-audioserver-beta/docker-compose.yml`

Finde diese Zeilen (sollten commented sein):

```yaml
    # USB Devices für Audio und Relais (Linux only - auskommentiert für Windows)
    # devices:
    #   - /dev/snd:/dev/snd      # Audio/Soundkarte
    #   - /dev/ttyUSB0:/dev/ttyUSB0  # USB Relais (ggf. anpassen: ttyUSB1, COM3 unter Windows)
```

**Ersetze mit:**

```yaml
    # USB Devices für Audio und Relais (Linux - auf Unraid aktiv!)
    devices:
      - /dev/snd:/dev/snd              # Audio/Soundkarte
      - /dev/ttyUSB_RELAY:/dev/ttyUSB0  # USB Relais (via udev-Rule)
```

**Wichtig:** Überprüfe auch die `environment` Sektion:

```yaml
    environment:
      PM_ENABLED: "true"
      PM_USB_PORT: "/dev/ttyUSB0"      # ← Muss so sein!
      PM_USB_BAUD_RATE: "9600"
      PM_CHANNEL: "1"
      PM_TURN_ON_AT_PLAY: "true"
      PM_TURN_OFF_DELAY: "5"
```

---

## 📤 SCHRITT 12: Änderungen pushen zu GitHub

```bash
cd /pfad/zu/lox-audioserver-beta

git add docker-compose.yml
git commit -m "Enable USB device mapping with udev-rule for USBRelay2"
git push
```

---

## 🐳 SCHRITT 13: Docker Container neu starten

Auf Unraid im Terminal:

```bash
cd /pfad/zu/lox-audioserver-beta

# Container runterfahren
docker-compose down -v

# Neu starten mit neuester Config
docker-compose up -d
```

**Warten Sie ~30 Sekunden bis Container vollständig hochgefahren ist.**

---

## ✅ SCHRITT 14: Überprüfen dass alles funktioniert

### Test 1: Relais im Container sichtbar?

```bash
docker exec lox-audioserver ls -la /dev/ttyUSB0
```

**✅ Expected Output:**
```
crw-rw-rw- 1 root tty 253, 0 Feb  5 21:35 /dev/ttyUSB0
```

### Test 2: PowerManager Status überprüfen

```bash
docker logs lox-audioserver | grep -i "powermanagement\|usbrelay"
```

**✅ Expected Output (SOLLTE KEINE FEHLER ZEIGEN):**
```
[INFO][PowerManagement|USBRelay] PowerManager service initialized
```

**❌ Falls Fehler wie "Failed to initialize USB Relais":**
→ Gehe zu **Troubleshooting**

### Test 3: API testen

```bash
curl http://localhost:7090/admin/api/powermanager/status | jq
```

**✅ Expected Output:**
```json
{
  "enabled": true,
  "message": "PowerManager enabled and ready",
  "state": "idle"
}
```

---

## 🚨 TROUBLESHOOTING

### Problem 1: `/dev/ttyUSB_RELAY` existiert nicht nach einstecken

**Ursache 1: udev-Rule wurde nicht geladen**

```bash
# Überprüfe ob Rule-Datei existiert:
cat /etc/udev/rules.d/99-usbrelay.rules

# Syntax überprüfen:
udevadm test /devices/pci0000:00/0000:00:01.2/0000:02:00.0/0000:03:08.0/0000:07:00.3/usb4/4-3/4-3.1 2>&1 | grep ttyUSB_RELAY
```

Falls kein Output: Rule-Datei erneut überprüfen (SCHRITT 5).

**Ursache 2: Relais nicht richtig erkannt**

```bash
# Überprüfe ob Relais wirklich da ist:
lsusb | grep 16c0

# Detaillierte Info:
lsusb -vvv | grep -A 10 "16c0:05df"
```

Falls nicht vorhanden: USB-Kabel prüfen, anderer USB-Port versuchen.

**Ursache 3: Relais wurde nicht neu erkannt**

```bash
# Trigger erneut erzwingen:
udevadm control --reload-rules
udevadm trigger

# Relais erneut aus/einstecken
```

---

### Problem 2: "Permission denied /dev/ttyUSB0" im Container

```bash
# Auf Unraid: Berechtigungen setzen
chmod 666 /dev/ttyUSB_RELAY

# Oder im docker-compose.yml privileged mode aktivieren:
# privileged: true
```

---

### Problem 3: Container startet nicht / "Failed to initialize"

```bash
# Logs anschauen:
docker logs lox-audioserver

# Falls Fehler sichtbar: Device-Fehler?
docker exec lox-audioserver lsusb | grep 16c0

# Falls nicht da: Gerät wurde nicht gemappt
# → docker-compose.yml überprüfen (SCHRITT 11)
```

---

### Problem 4: Relais funktioniert immer noch nicht nach allem

**Ganz schnelle Debug-Routine:**

```bash
# 1. Alles überprüfen
echo "=== Unraid Seite ==="
ls -la /dev/ttyUSB_RELAY
lsusb | grep 16c0
dmesg | grep -i "16c0\|usbrelay" | tail -5

echo "=== Container Seite ==="
docker exec lox-audioserver ls -la /dev/ttyUSB0
docker exec lox-audioserver lsusb | grep 16c0

echo "=== Logs ==="
docker logs lox-audioserver | grep -i "usbrelay\|powermanagement" | tail -10
```

Falls du da Output zeigst → können wir genau sehen was falsch ist!

---

## 🎉 FERTIG!

Wenn du bis hier gekommen bist und alle Tests grün sind:

✅ Relais ist erkannt  
✅ PowerManager funktioniert  
✅ Audio-Devices funktionieren  
✅ Alles ready zum Verwenden!

---

## 📞 Kontakt / Fragen

Falls etwas nicht funktioniert:
1. Welcher Schritt macht Probleme?
2. Was ist die genaue Fehlermeldung?
3. Output von den Debug-Befehlen oben zeigen

Dann können wir schnell fix finden! 🔧

