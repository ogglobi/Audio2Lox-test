// @ts-nocheck
import { SerialPort } from 'serialport';
import { createLogger } from '@/shared/logging/logger';

/**
 * USB Relais Manager für ARCELI SRD-05VDC-SL-C und ähnliche Modelle
 * 
 * Kommando-Format:
 * - ON:  0xFF 0x01 0x01 (3 bytes)
 * - OFF: 0xFF 0x01 0x00 (3 bytes)
 * 
 * Für Multi-Channel Relais (z.B. 4-Kanal):
 * - Channel 1 ON:  0xFF 0x01 0x01
 * - Channel 2 ON:  0xFF 0x02 0x01
 * - Channel 1 OFF: 0xFF 0x01 0x00
 * 
 * Referenz: https://www.amazon.de/ARCELI-SRD-05VDC-SL-C-Relais-Modul
 */

export interface USBRelayConfig {
  enabled: boolean;
  port: string;              // z.B. "/dev/ttyUSB0" (Linux) oder "COM3" (Windows)
  baudRate: number;          // Typisch: 9600
  channel: number;           // Kanal: 1-4 (für Multi-Channel Modelle)
  turnOnAtPlayStart: boolean;
  turnOffAfterStopDelay: number;  // Sekunden
}

export class USBRelayManager {
  private readonly log = createLogger('PowerManagement', 'USBRelay');
  private serialPort: SerialPort | null = null;
  private relayState: 'on' | 'off' = 'off';
  private stopTimeoutId: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private config: USBRelayConfig;

  constructor(config: USBRelayConfig) {
    this.config = config;
  }

  /**
   * Initialisiert die serielle Verbindung zum USB-Relais
   */
  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.log.info('USB Relais disabled in config');
      return;
    }

    try {
      this.serialPort = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudRate,
        autoOpen: false,
      });

      // Event Handler
      this.serialPort.on('error', (error: Error) => {
        this.log.error('Serial port error', { error: error.message });
      });

      this.serialPort.on('close', () => {
        this.log.info('Serial port closed');
        this.isInitialized = false;
      });

      // Port öffnen
      await new Promise<void>((resolve, reject) => {
        if (!this.serialPort) {
          reject(new Error('SerialPort not initialized'));
          return;
        }
        this.serialPort.open((error: Error | null) => {
          if (error) {
            reject(error);
          } else {
            this.log.info('USB Relais connected', {
              port: this.config.port,
              baudRate: this.config.baudRate,
              channel: this.config.channel,
            });
            this.isInitialized = true;
            resolve();
          }
        });
      });

      // Initial: Relais ausschalten
      await this.turnRelayOff();
    } catch (error) {
      this.log.error('Failed to initialize USB Relais', {
        port: this.config.port,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Behandelt Playback-State-Änderungen
   */
  public async handlePlaybackStateChange(
    state: 'playing' | 'paused' | 'stopped',
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
  private async turnRelayOn(): Promise<void> {
    if (this.relayState === 'on') {
      return;  // Schon an
    }

    try {
      // Timeout für Stop-Befehl clearen
      if (this.stopTimeoutId) {
        clearTimeout(this.stopTimeoutId);
        this.stopTimeoutId = null;
      }

      // Relais-Kommando senden: 0xFF 0x01 0x01 (ON)
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
  private async turnRelayOff(): Promise<void> {
    if (this.relayState === 'off') {
      return;  // Schon aus
    }

    try {
      // Relais-Kommando senden: 0xFF 0x01 0x00 (OFF)
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
   * Baut Relais-Kommando für ARCELI USB Relais
   * 
   * Format:
   * Byte 0: 0xFF (Präfix)
   * Byte 1: Channel (0x01-0x04)
   * Byte 2: State (0x01 = ON, 0x00 = OFF)
   */
  private buildCommand(channel: number, state: boolean): Buffer {
    const command = Buffer.alloc(3);
    command[0] = 0xff;              // Präfix
    command[1] = Math.min(channel, 4);  // Channel 1-4
    command[2] = state ? 0x01 : 0x00;   // State
    return command;
  }

  /**
   * Sendet Kommando über serielle Schnittstelle
   */
  private async sendCommand(command: Buffer): Promise<void> {
    if (!this.serialPort || !this.isInitialized) {
      throw new Error('Serial port not initialized');
    }

    return new Promise((resolve, reject) => {
      this.serialPort!.write(command, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          this.log.debug('Command sent', {
            command: command.toString('hex'),
          });
          resolve();
        }
      });
    });
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
      await this.delay(500);  // 500ms an

      await this.turnRelayOff();
      await this.delay(500);  // 500ms aus
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

    if (this.serialPort && this.serialPort.isOpen) {
      return new Promise((resolve) => {
        this.serialPort!.close(() => {
          this.isInitialized = false;
          resolve();
        });
      });
    }
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
    initialized: boolean;
    relayState: 'on' | 'off';
    port: string;
    channel: number;
  } {
    return {
      initialized: this.isInitialized,
      relayState: this.relayState,
      port: this.config.port,
      channel: this.config.channel,
    };
  }
}
