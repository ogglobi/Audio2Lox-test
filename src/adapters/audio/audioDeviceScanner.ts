import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
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
  maxChannels: number;
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
 * A virtual ALSA device defined in /etc/asound.conf.
 */
export interface VirtualAlsaDevice {
  /** PCM name, e.g. "card0_ch0", "card1_stereo01" */
  id: string;
  /** "mono" or "stereo" */
  mode: 'mono' | 'stereo';
  /** Physical card number */
  cardId: number;
  /** Output channel index(es) */
  outputChannels: number[];
  /** Human-readable label */
  label: string;
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
   * Get virtual ALSA devices defined in /etc/asound.conf.
   */
  async getVirtualDevices(): Promise<VirtualAlsaDevice[]> {
    try {
      const content = await readFile('/etc/asound.conf', 'utf-8');
      return this.parseAsoundConf(content);
    } catch {
      this.log.debug('No /etc/asound.conf or parse error');
      return [];
    }
  }

  /**
   * Scan ALSA devices using arecord/aplay.
   */
  private async scanAlsaDevices(): Promise<AudioDevice[]> {
    const devices: Map<string, AudioDevice> = new Map();

    const recordList = await this.execShellCommand('arecord -l 2>/dev/null || true');
    if (recordList) {
      this.parseAlsaList(recordList, 'capture', devices);
    }

    const playList = await this.execShellCommand('aplay -l 2>/dev/null || true');
    if (playList) {
      this.parseAlsaList(playList, 'playback', devices);
    }

    // Detect max channels for each playback device
    for (const device of devices.values()) {
      const playbackChannels = device.channels.filter(
        (ch) => ch.direction === 'playback',
      );
      if (playbackChannels.length > 0) {
        const maxCh = await this.detectMaxChannels(
          `hw:${device.cardId},${playbackChannels[0].deviceId}`,
        );
        device.maxChannels = maxCh;
      }
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
   * Parse arecord/aplay output format.
   * Lines look like:
   *   card 0: Generic [HD-Audio Generic], device 0: ALC1220 Analog [ALC1220 Analog]
   *     Subdevices: 1/1
   *     Subdevice #0: subdevice #0
   *
   * Card number and device number are on the SAME line.
   */
  private parseAlsaList(
    output: string,
    direction: 'capture' | 'playback',
    devices: Map<string, AudioDevice>,
  ): void {
    const lines = output.split('\n');
    let lastChannel: AudioChannel | null = null;

    for (const line of lines) {
      // Match: card N: ID [Name], device M: DevName [DevLongName]
      const fullMatch = line.match(
        /^card\s+(\d+):\s+(\w+)\s+\[([^\]]+)\],\s*device\s+(\d+):\s+([^\[]+)\[([^\]]+)\]/,
      );
      if (fullMatch) {
        const cardNum = parseInt(fullMatch[1], 10);
        const cardId = fullMatch[2];
        const cardName = fullMatch[3];
        const devNum = parseInt(fullMatch[4], 10);
        const devName = fullMatch[5].trim();

        const deviceKey = `hw:${cardNum}`;
        if (!devices.has(deviceKey)) {
          devices.set(deviceKey, {
            id: deviceKey,
            cardId: cardNum,
            deviceId: 0,
            name: cardId,
            longName: cardName,
            driver: '',
            maxChannels: 2,
            channels: [],
          });
        }

        const channelId = `hw:${cardNum},${devNum}`;
        const channel: AudioChannel = {
          id: channelId,
          name: devName,
          direction,
          cardId: cardNum,
          deviceId: devNum,
          subdeviceCount: 1,
        };

        const device = devices.get(deviceKey)!;
        device.longName = cardName;
        device.channels.push(channel);
        lastChannel = channel;
        continue;
      }

      // Parse subdevice count
      const subdevMatch = line.match(/^\s+Subdevices:\s+(\d+)\/(\d+)/);
      if (subdevMatch && lastChannel) {
        lastChannel.subdeviceCount = parseInt(subdevMatch[2], 10);
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

  /**
   * Detect max channel count for an ALSA hardware device.
   *
   * Strategy:
   * 1. Try `aplay --dump-hw-params` (works for onboard / PCI cards)
   * 2. Fallback: parse `/proc/asound/cardN/stream0` (works for USB audio)
   */
  private async detectMaxChannels(hwDevice: string): Promise<number> {
    // --- Strategy 1: hw_params ---
    try {
      const output = await this.execShellCommand(
        `aplay -D ${hwDevice} --dump-hw-params /dev/null 2>&1 || true`,
      );
      // Look for CHANNELS line, e.g.: "CHANNELS: [2 8]" or "CHANNELS: 2"
      const chMatch = output.match(/CHANNELS:\s*(?:\[(\d+)\s+(\d+)\]|(\d+))/i);
      if (chMatch) {
        const max = chMatch[2] || chMatch[3] || chMatch[1];
        if (max) {
          const val = parseInt(max, 10);
          this.log.debug('Detected max channels via hw_params', { hwDevice, maxChannels: val });
          return val;
        }
      }
    } catch {
      // hw_params failed – try fallback
    }

    // --- Strategy 2: /proc/asound/cardN/stream0 (USB devices) ---
    const cardMatch = hwDevice.match(/hw:(\d+)/);
    if (cardMatch) {
      try {
        const streamPath = `/proc/asound/card${cardMatch[1]}/stream0`;
        const stream = await this.execShellCommand(`cat ${streamPath} 2>/dev/null || true`);
        // Find all "Channels: N" lines in Playback section and take the maximum
        const playbackSection = stream.split(/Capture:/i)[0] || stream;
        const channelMatches = [...playbackSection.matchAll(/Channels:\s*(\d+)/gi)];
        if (channelMatches.length > 0) {
          const maxCh = Math.max(...channelMatches.map((m) => parseInt(m[1], 10)));
          this.log.debug('Detected max channels via stream0', { hwDevice, maxChannels: maxCh });
          return maxCh;
        }
      } catch {
        // stream0 not available
      }
    }

    this.log.debug('Could not detect max channels, defaulting to 2', { hwDevice });
    return 2; // default stereo
  }

  /**
   * Parse /etc/asound.conf to find virtual PCM devices.
   * Looks for our naming convention: card<N>_ch<C> (mono) and card<N>_stereo<A><B>.
   */
  private parseAsoundConf(content: string): VirtualAlsaDevice[] {
    const devices: VirtualAlsaDevice[] = [];

    // Channel labels for nice display
    const chLabels = [
      'Front-Left',
      'Front-Right',
      'Rear-Left',
      'Rear-Right',
      'Center',
      'LFE/Sub',
      'Side-Left',
      'Side-Right',
    ];

    // Find all pcm.XXX { blocks
    const pcmPattern = /^pcm\.(card(\d+)(?:d(\d+))?_(ch(\d+)|stereo(\d)(\d)))\s*\{/gm;
    let match;
    while ((match = pcmPattern.exec(content)) !== null) {
      const id = match[1];
      const cardId = parseInt(match[2], 10);
      const isMono = match[5] !== undefined;

      if (isMono) {
        const ch = parseInt(match[5], 10);
        const label = ch < chLabels.length ? chLabels[ch] : `Ch${ch}`;
        devices.push({
          id,
          mode: 'mono',
          cardId,
          outputChannels: [ch],
          label: `Card ${cardId} → Ch ${ch} (${label})`,
        });
      } else {
        const chA = parseInt(match[6], 10);
        const chB = parseInt(match[7], 10);
        const labelA = chA < chLabels.length ? chLabels[chA] : `Ch${chA}`;
        const labelB = chB < chLabels.length ? chLabels[chB] : `Ch${chB}`;
        devices.push({
          id,
          mode: 'stereo',
          cardId,
          outputChannels: [chA, chB],
          label: `Card ${cardId} → Ch ${chA}+${chB} (${labelA}/${labelB})`,
        });
      }
    }

    return devices;
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
