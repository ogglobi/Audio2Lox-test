// @ts-nocheck
import { promises as fs } from 'fs';
import { createLogger } from '@/shared/logging/logger';

/**
 * USB Relais Manager für USBRelay2 (16c0:05df)
 *
 * Nutzt HID-Gerät direkt (/dev/hidraw*) statt SerialPort
 * Funktioniert mit HID-Geräten die direkt vom Kernel erkannt werden
 *
 * Protokoll basiert auf dem offiziellen usbrelay-Projekt (github.com/darrylb123/usbrelay)
 *
 * Kommando-Format für DCTTECH USBRelay2 (direkt via /dev/hidraw):
 * - Byte 0: State    → 0xFF = ON, 0xFD = OFF
 * - Byte 1: Relay-Nr → 0x01-0x08
 * - Byte 2-7: 0x00   (Padding auf 8 Bytes)
 *
 * Beispiele:
 * - Relay 1 ON:  0xFF 0x01 0x00 0x00 0x00 0x00 0x00 0x00
 * - Relay 1 OFF: 0xFD 0x01 0x00 0x00 0x00 0x00 0x00 0x00
 * - Relay 2 ON:  0xFF 0x02 0x00 0x00 0x00 0x00 0x00 0x00
 *
 * Referenz: libusbrelay.c → operate_relay() → case DCTTECH
 */

export interface USBRelayConfig {
  enabled: boolean;
  port: string; // z.B. "/dev/hidraw0" (HID-Gerät) oder "/dev/ttyUSB0" (Serial)
  baudRate: number; // Nur für Serial - ignoriert bei HID
  channel: number; // Kanal: 1-4
  turnOnAtPlayStart: boolean;
  turnOffAfterStopDelay: number; // Sekunden
}

export class USBRelayManager {
  private readonly log = createLogger('PowerManagement', 'USBRelay');
  private hidDevicePath: string | null = null;
  private isHidDevice = false; // True wenn es ein HID-Gerät ist
  private relayState: 'on' | 'off' = 'off';
  private stopTimeoutId: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private config: USBRelayConfig;

  constructor(config: USBRelayConfig) {
    this.config = config;
  }

  /**
   * Initialisiert die Verbindung zum USB-Relais (HID oder Serial)
   */
  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.log.info('USB Relais disabled in config');
      return;
    }

    try {
      // Überprüfe ob es ein HID-Gerät ist
      this.isHidDevice =
        this.config.port.includes('hidraw') || this.config.port.includes('hiddev');

      if (this.isHidDevice) {
        await this.initializeHID();
      } else {
        // Fallback für SerialPort (legacy)
        await this.initializeSerial();
      }

      // Initial: Relais ausschalten
      await this.turnRelayOff();

      this.log.info('USB Relais initialized successfully', {
        port: this.config.port,
        type: this.isHidDevice ? 'HID' : 'Serial',
        channel: this.config.channel,
      });
      this.isInitialized = true;
    } catch (error) {
      this.log.error('Failed to initialize USB Relais', {
        port: this.config.port,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialisiert HID-Gerät (z.B. /dev/hidraw0)
   */
  private async initializeHID(): Promise<void> {
    try {
      // Test ob die Datei existiert
      await fs.access(this.config.port);
      this.hidDevicePath = this.config.port;

      this.log.info('HID device verified', {
        port: this.config.port,
      });
    } catch (error) {
      throw new Error(
        `Failed to open HID device ${this.config.port}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Initialisiert serielles Gerät (z.B. /dev/ttyUSB0) - Legacy
   */
  private async initializeSerial(): Promise<void> {
    // Placeholder für Serial-Support
    // Nur HID wird für jetzt aktiv unterstützt
    throw new Error(
      'Serial port support requires serialport module. Please use HID device (/dev/hidraw*) instead.'
    );
  }

  /**
   * Behandelt Playback-State-Änderungen
   */
  public async handlePlaybackStateChange(
    state: 'playing' | 'paused' | 'stopped'
  ): Promise<void> {
    if (!this.isInitialized) return;

    this.log.debug('Playback state changed', { state });

    if (state === 'playing') {
      // Musik startet → Relais EIN
      await this.turnRelayOn();
    } else if (state === 'stopped') {
      // Musik stoppt → Relais mit Verzögerung AUS
      // (um Klicks bei sehr kurzen Pausen zu vermeiden)
      this.scheduleRelayOff(this.config.turnOffAfterStopDelay);
    } else if (state === 'paused') {
      // Musik pausiert → Relais bleibt an
      this.log.debug('Pause: keeping relay on');
    }
  }

  /**
   * Schaltet Relais EIN
   */
  public async turnRelayOn(): Promise<void> {
    if (this.relayState === 'on') {
      return; // Schon an
    }

    try {
      // Timeout für Stop-Befehl clearen
      if (this.stopTimeoutId) {
        clearTimeout(this.stopTimeoutId);
        this.stopTimeoutId = null;
      }

      // Relais-Kommando senden: 0xFF [channel] (ON per dcttech-Protokoll)
      const command = this.buildCommand(this.config.channel, true);
      await this.sendCommand(command);

      this.relayState = 'on';
      this.log.info('Relay turned ON', { channel: this.config.channel });
    } catch (error) {
      this.log.error('Failed to turn relay on', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Schaltet Relais mit Verzögerung AUS
   */
  private scheduleRelayOff(delaySeconds: number): void {
    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
    }

    this.stopTimeoutId = setTimeout(() => {
      void this.turnRelayOff();
      this.stopTimeoutId = null;
    }, delaySeconds * 1000);

    this.log.debug('Relay OFF scheduled', { delaySeconds });
  }

  /**
   * Schaltet Relais AUS
   */
  public async turnRelayOff(): Promise<void> {
    if (this.relayState === 'off') {
      return; // Schon aus
    }

    try {
      // Relais-Kommando senden: 0xFD [channel] (OFF per dcttech-Protokoll)
      const command = this.buildCommand(this.config.channel, false);
      await this.sendCommand(command);

      this.relayState = 'off';
      this.log.info('Relay turned OFF', { channel: this.config.channel });
    } catch (error) {
      this.log.error('Failed to turn relay off', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Baut Relais-Kommando für DCTTECH USBRelay2
   *
   * Protokoll (aus libusbrelay.c → operate_relay → case DCTTECH):
   * Byte 0: State      → 0xFF = CMD_ON, 0xFD = CMD_OFF
   * Byte 1: Relay-Nr   → 1-8
   * Byte 2-7: 0x00     (Padding auf 8 Bytes, HID Report Size)
   *
   * Hinweis: Bei direktem hidraw-Zugriff entfällt die Report-ID (0x00),
   * die hidapi intern als buf[0] sendet. Wir schreiben direkt 8 Datenbytes.
   */
  private buildCommand(channel: number, state: boolean): Buffer {
    const CMD_ON = 0xff;
    const CMD_OFF = 0xfd;
    const command = Buffer.alloc(8); // 8 Bytes HID Report
    command[0] = state ? CMD_ON : CMD_OFF; // State-Byte
    command[1] = Math.min(Math.max(channel, 1), 8); // Relay-Nummer 1-8
    // Bytes 2-7 bleiben 0x00 (Buffer.alloc ist zero-filled)
    return command;
  }

  /**
   * Sendet Kommando über HID-Schnittstelle
   */
  private async sendCommand(command: Buffer): Promise<void> {
    if (!this.isInitialized || !this.isHidDevice || !this.hidDevicePath) {
      throw new Error('HID device not initialized');
    }

    try {
      const fileHandle = await fs.open(this.hidDevicePath, 'r+');
      await fileHandle.write(command);
      await fileHandle.close();

      this.log.debug('Command sent via HID', {
        command: command.toString('hex'),
      });
    } catch (error) {
      throw new Error(
        `Failed to send HID command: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Test-Funktion: Relais 5x ein/aus schalten
   */
  public async testRelay(cycleCount: number = 3): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('USB Relais not initialized');
    }

    this.log.info('Starting relay test', { cycles: cycleCount });

    for (let i = 0; i < cycleCount; i++) {
      this.log.info('Relay test cycle', { current: i + 1, total: cycleCount });

      await this.turnRelayOn();
      await this.delay(500); // 500ms an

      await this.turnRelayOff();
      await this.delay(500); // 500ms aus
    }

    this.log.info('Relay test completed');
  }

  /**
   * Cleanup: Relais ausschalten und Port schließen
   */
  public async shutdown(): Promise<void> {
    this.log.info('Shutting down USB Relais');

    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    try {
      await this.turnRelayOff();
    } catch (error) {
      this.log.warn('Error turning relay off during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.isInitialized = false;
  }

  /**
   * Hilfsfunktion: Verzögerung
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Status abrufen
   */
  public getStatus(): {
    enabled: boolean;
    initialized: boolean;
    port: string;
    channel: number;
    relayState: 'on' | 'off';
  } {
    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      port: this.config.port,
      channel: this.config.channel,
      relayState: this.relayState,
    };
  }
}
