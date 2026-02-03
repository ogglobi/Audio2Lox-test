import { execFile } from 'node:child_process';
import { createLogger } from '@/shared/logging/logger';

/**
 * Represents a single audio device/card in the system.
 */
export interface AudioDevice {
  id: string; // e.g., "hw:0", "hw:1"
  cardId: number;
  deviceId: number;
  name: string;
  longName: string;
  driver: string;
  channels: AudioChannel[];
}

/**
 * Represents a single audio channel/PCM device.
 */
export interface AudioChannel {
  id: string; // e.g., "hw:0,0" (card:device)
  name: string;
  direction: 'playback' | 'capture';
  cardId: number;
  deviceId: number;
  subdeviceCount: number;
}

/**
 * Scans available ALSA audio devices.
 */
export class AudioDeviceScanner {
  private readonly log = createLogger('Audio', 'DeviceScanner');

  /**
   * Get all available ALSA audio devices.
   */
  async getDevices(): Promise<AudioDevice[]> {
    try {
      return await this.scanAlsaDevices();
    } catch (error) {
      this.log.warn('Failed to scan audio devices', { error: String(error) });
      return [];
    }
  }

  /**
   * Scan ALSA devices using arecord/aplay and amixer.
   */
  private async scanAlsaDevices(): Promise<AudioDevice[]> {
    const devices: Map<string, AudioDevice> = new Map();

    // Try to get device list from arecord -l
    const recordList = await this.execShellCommand('arecord -l 2>/dev/null || true');
    if (recordList) {
      this.parseAlsaList(recordList, 'capture', devices);
    }

    // Try to get device list from aplay -l
    const playList = await this.execShellCommand('aplay -l 2>/dev/null || true');
    if (playList) {
      this.parseAlsaList(playList, 'playback', devices);
    }

    return Array.from(devices.values());
  }

  /**
   * Execute a shell command and return stdout.
   */
  private execShellCommand(cmd: string): Promise<string> {
    return new Promise((resolve) => {
      execFile('sh', ['-c', cmd], (error, stdout) => {
        resolve(stdout || '');
      });
    });
  }

  /**
   * Parse arecord/aplay output format:
   * card 0: PCH [HDA Intel PCH], device 0: ALC892 Analog [ALC892 Analog]
   *   Subdevices: 1/1
   *   Subdevice #0: subdevice #0
   */
  private parseAlsaList(
    output: string,
    direction: 'capture' | 'playback',
    devices: Map<string, AudioDevice>,
  ): void {
    const lines = output.split('\n');
    let currentCard: number | null = null;
    let currentCardName = '';

    for (const line of lines) {
      const cardMatch = line.match(/^card\s+(\d+):\s+(\w+)\s+\[([^\]]+)\]/);
      if (cardMatch) {
        currentCard = parseInt(cardMatch[1], 10);
        const cardId = cardMatch[2];
        currentCardName = cardMatch[3];

        const deviceKey = `hw:${currentCard}`;
        if (!devices.has(deviceKey)) {
          devices.set(deviceKey, {
            id: deviceKey,
            cardId: currentCard,
            deviceId: 0,
            name: cardId,
            longName: currentCardName,
            driver: '', // Will be filled if available
            channels: [],
          });
        }
        continue;
      }

      const deviceMatch = line.match(/^\s+device\s+(\d+):\s+([^\[]+)\s+\[([^\]]+)\]/);
      if (deviceMatch && currentCard !== null) {
        const deviceId = parseInt(deviceMatch[1], 10);
        const deviceName = deviceMatch[2].trim();
        const deviceLongName = deviceMatch[3];

        const channelId = `hw:${currentCard},${deviceId}`;
        const channel: AudioChannel = {
          id: channelId,
          name: deviceName,
          direction,
          cardId: currentCard,
          deviceId,
          subdeviceCount: 1,
        };

        const device = devices.get(`hw:${currentCard}`);
        if (device) {
          // Update with more specific info
          device.longName = currentCardName;
          device.channels.push(channel);
        }
      }

      // Parse subdevice count
      const subdevMatch = line.match(/^\s+Subdevices:\s+(\d+)\/(\d+)/);
      if (subdevMatch && currentCard !== null) {
        const totalSubdevices = parseInt(subdevMatch[2], 10);
        const device = devices.get(`hw:${currentCard}`);
        if (device && device.channels.length > 0) {
          device.channels[device.channels.length - 1].subdeviceCount = totalSubdevices;
        }
      }
    }
  }

  /**
   * Get more detailed information about a specific device (if available).
   */
  async getDeviceInfo(deviceId: string): Promise<Record<string, unknown>> {
    try {
      // Try to use amixer to get more info
      const output = await this.execShellCommand(`amixer -D hw:${deviceId} info`);
      return this.parseAmixerInfo(output);
    } catch (error) {
      this.log.debug('Failed to get device info', { deviceId, error: String(error) });
      return {};
    }
  }

  private parseAmixerInfo(output: string): Record<string, unknown> {
    const info: Record<string, unknown> = {};

    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^Card (.+)$/);
      if (match) {
        info.card = match[1];
        continue;
      }

      const driverMatch = line.match(/^Card short name '(.+)'$/);
      if (driverMatch) {
        info.shortName = driverMatch[1];
        continue;
      }

      const mixerMatch = line.match(/^Number of mixers: (\d+)$/);
      if (mixerMatch) {
        info.mixerCount = parseInt(mixerMatch[1], 10);
        continue;
      }
    }

    return info;
  }
}

/**
 * Create and cache a singleton instance of the scanner.
 */
let scannerInstance: AudioDeviceScanner | null = null;

export function getAudioDeviceScanner(): AudioDeviceScanner {
  if (!scannerInstance) {
    scannerInstance = new AudioDeviceScanner();
  }
  return scannerInstance;
}
