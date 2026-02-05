# ⚠️ IMPORTANT: HID Device Detection Issue

## Status Update

Dein USBRelay2 wird von Unraid als **HID-Gerät erkannt**, nicht als serielles Gerät!

```
dmesg Output:
hid-generic 0003:16C0:05DF.0007: hiddev98,hidraw3: USB HID v1.01 Device [www.dcttech.com USBRelay2]
```

**Bedeutung:**
- ✅ Gerät wird erkannt
- ❌ Nicht als `/dev/ttyUSB*` sondern als `/dev/hiddev98` oder `/dev/hidraw3`
- ❌ Unsere aktuelle PowerManager-Implementierung funktioniert NICHT mit HID-Geräten

## Lösungsoptionen

### Option A: HID-Gerät-Unterstützung implementieren (Komplex)

Wir müssten die PowerManager-Implementierung umschreiben, um HID-Geräte zu unterstützen:

```typescript
// Statt SerialPort verwenden:
import { openHidDevice } from 'some-hid-library';

// Mit diesen Commands für USBRelay2:
// Command Format: 0xFF 0x01 0x01 0x01 (Relais 1 einschalten)
// Command Format: 0xFF 0x02 0x01 0x01 (Relais 1 ausschalten)
```

**Aufwand:** Hoch - neue Dependency, neue Testings
**Vorteil:** Dein vorhandenes Relais funktioniert

### Option B: USB-zu-UART-Adapter verwenden (Einfach) ⭐ EMPFOHLEN

Kaufe einen billigen USB-zu-UART/TTL-Adapter und baue dein Relais daran an:

```
USB-zu-UART-Adapter
├─ USB-Stecker → Computer/Unraid
├─ TX/RX Pins → Relais-Platine
└─ GND → Relais-GND

Wird als /dev/ttyUSB* erkannt ✓
```

**Aufwand:** Minimal - nur Hardware
**Kosten:** ~5-15€
**Vorteil:** Funktioniert sofort mit aktuellem PowerManager

### Option C: Anderes Relais kaufen (Teuer)

Es gibt Relais die direkt als `/dev/ttyUSB*` erkannt werden.

**Aufwand:** Kosten (~40€), Zeit
**Vorteil:** Plug & Play

## Was will der User machen?

Bitte entscheide dich für eine Option:

### Falls Option B (USB-zu-UART): 
Welches Relais-Modell verwendest du genau? Ich kann dir zeigen, wie du es anschließt.

### Falls Option A (HID-Support):
Lass mich die PowerManager-Implementierung für HID-Geräte erweitern. Das dauert ca. 2-3 Stunden für vollständiges Testing.

### Falls Option C (Neues Relais):
Welche Relais-Art möchtest du? (ARCELI mit TTL, oder anderes Modell?)

---

**Aktuelle Situation:**
- ❌ Audio-Devices sollten funktionieren (werden auch erkannt)
- ❌ PowerManager wird NICHT funktionieren mit aktuellem Code

**Nächste Schritte:**
1. Entscheide dich für eine Option (A/B/C)
2. Ich passe den Code oder die Hardware-Anleitung an
3. Danach wird alles funktionieren

