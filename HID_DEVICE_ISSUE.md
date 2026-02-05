# ⚠️ IMPORTANT: HID Device Detection Issue - SOLVED ✅

## Status Update

Dein USBRelay2 wird von Unraid als **HID-Gerät erkannt**, nicht als serielles Gerät!

```
dmesg Output:
hid-generic 0003:16C0:05DF.0007: hiddev98,hidraw3: USB HID v1.01 Device [www.dcttech.com USBRelay2]
```

## Die Lösung: udev-Rule ⭐

Wir erstellen eine **udev-Rule**, die das HID-Gerät zu einem seriellen Port macht!

```bash
# Das ist alles was du brauchst:
SUBSYSTEMS=="usb", ATTRS{idVendor}=="16c0", ATTRS{idProduct}=="05df", SYMLINK+="ttyUSB_RELAY"
```

**Was das macht:**
- ✅ Relais wird weiterhin als `/dev/hidraw3` erkannt
- ✅ Aber auch als `/dev/ttyUSB_RELAY` verfügbar (Symlink)
- ✅ PowerManager funktioniert sofort ohne Code-Änderungen!

## Installation auf Unraid

**Schritt 1: Datei kopieren**
```bash
scp 99-usbrelay.rules root@unraid-ip:/etc/udev/rules.d/
```

**Schritt 2: udev neu laden**
```bash
ssh root@unraid-ip
udevadm control --reload-rules
udevadm trigger
```

**Schritt 3: Relais aus/einstecken**
(Um die neue Rule anzuwenden)

**Schritt 4: Überprüfen**
```bash
ls -la /dev/ttyUSB_RELAY
```

## docker-compose.yml anpassen

```yaml
devices:
  - /dev/snd:/dev/snd               # Audio-Soundkarte
  - /dev/ttyUSB_RELAY:/dev/ttyUSB0  # Relais

environment:
  PM_USB_PORT: "/dev/ttyUSB0"       # Im Container ist es jetzt /dev/ttyUSB0
```

---

**Soundkarte:** ✅ Braucht nichts Besonderes
- Wird über ALSA erkannt (aplay/arecord)
- `/dev/snd` mapping reicht aus
- AudioDeviceScanner funktioniert perfekt damit

**Details:** Siehe [UDEV_RULE_SETUP.md](UDEV_RULE_SETUP.md)

