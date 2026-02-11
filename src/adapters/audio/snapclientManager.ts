import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '@/shared/logging/logger';

const log = createLogger('Audio', 'SnapclientManager');

/** Persisted configuration for one snapclient instance. */
export interface SnapclientConfig {
  /** Unique id, also used as Snapcast hostID. */
  id: string;
  /** Human-readable name (e.g. "Küche"). */
  name: string;
  /** ALSA virtual device to play to (e.g. "card1_ch2"). */
  alsaDevice: string;
  /** Whether this client should auto-start with the server. */
  enabled: boolean;
}

/** Runtime status of one snapclient. */
export interface SnapclientStatus extends SnapclientConfig {
  running: boolean;
  pid: number | null;
}

const CONFIG_DIR = '/opt/audio2lox';
const CONFIG_FILE = join(CONFIG_DIR, 'snapclients.json');

/**
 * Manages multiple snapclient processes, each outputting to a
 * different ALSA virtual device (mono channel or stereo pair).
 */
export class SnapclientManager {
  private clients: Map<string, SnapclientConfig> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private snapserverHost = '127.0.0.1';
  private snapserverPort = 1704;

  constructor(host?: string, port?: number) {
    if (host) this.snapserverHost = host;
    if (port) this.snapserverPort = port;
  }

  /** Load persisted config and auto-start enabled clients. */
  async init(): Promise<void> {
    await this.loadConfig();
    const enabled = [...this.clients.values()].filter((c) => c.enabled);
    log.info('SnapclientManager initialised', {
      total: this.clients.size,
      autoStart: enabled.length,
    });
    for (const client of enabled) {
      this.startProcess(client);
    }
  }

  /** Gracefully stop all running clients. */
  async shutdown(): Promise<void> {
    log.info('Shutting down all snapclients');
    for (const id of this.processes.keys()) {
      this.stopProcess(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** List all configured clients with status. */
  getAll(): SnapclientStatus[] {
    return [...this.clients.values()].map((c) => this.toStatus(c));
  }

  /** Get one client status. */
  get(id: string): SnapclientStatus | null {
    const c = this.clients.get(id);
    return c ? this.toStatus(c) : null;
  }

  /** Create or update a client config. Starts it if enabled. */
  async upsert(config: SnapclientConfig): Promise<SnapclientStatus> {
    // Stop old process if running
    this.stopProcess(config.id);

    this.clients.set(config.id, config);
    await this.saveConfig();

    if (config.enabled) {
      this.startProcess(config);
    }

    log.info('Snapclient upserted', { id: config.id, alsa: config.alsaDevice });
    return this.toStatus(config);
  }

  /** Remove a client and stop its process. */
  async remove(id: string): Promise<boolean> {
    this.stopProcess(id);
    const deleted = this.clients.delete(id);
    if (deleted) await this.saveConfig();
    return deleted;
  }

  /** Start a client by id. */
  start(id: string): boolean {
    const c = this.clients.get(id);
    if (!c) return false;
    this.startProcess(c);
    return true;
  }

  /** Stop a client by id. */
  stop(id: string): boolean {
    return this.stopProcess(id);
  }

  // ---------------------------------------------------------------------------
  // Process management
  // ---------------------------------------------------------------------------

  private startProcess(config: SnapclientConfig): void {
    if (this.processes.has(config.id)) {
      this.stopProcess(config.id);
    }

    const args = [
      '--host',
      this.snapserverHost,
      '--port',
      String(this.snapserverPort),
      '--soundcard',
      config.alsaDevice,
      '--hostID',
      config.id,
      '--player',
      'alsa',
    ];

    log.info('Starting snapclient', { id: config.id, args: args.join(' ') });

    try {
      const proc = spawn('snapclient', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      proc.on('error', (err) => {
        log.error('Snapclient process error', {
          id: config.id,
          error: String(err),
        });
        this.processes.delete(config.id);
      });

      proc.on('exit', (code) => {
        log.info('Snapclient exited', { id: config.id, code });
        this.processes.delete(config.id);
      });

      // Log stderr for debugging
      proc.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) log.debug(`[snapclient:${config.id}] ${msg}`);
      });

      this.processes.set(config.id, proc);
    } catch (err) {
      log.error('Failed to spawn snapclient', {
        id: config.id,
        error: String(err),
      });
    }
  }

  private stopProcess(id: string): boolean {
    const proc = this.processes.get(id);
    if (!proc) return false;

    try {
      proc.kill('SIGTERM');
      // Force kill after 3s
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* already dead */
        }
      }, 3000);
    } catch {
      /* already dead */
    }

    this.processes.delete(id);
    log.info('Stopped snapclient', { id });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadConfig(): Promise<void> {
    try {
      const raw = await readFile(CONFIG_FILE, 'utf-8');
      const arr: SnapclientConfig[] = JSON.parse(raw);
      this.clients.clear();
      for (const c of arr) {
        if (c.id && c.alsaDevice) {
          this.clients.set(c.id, c);
        }
      }
      log.debug('Loaded snapclient config', { count: this.clients.size });
    } catch {
      log.debug('No snapclient config found – starting fresh');
    }
  }

  private async saveConfig(): Promise<void> {
    const arr = [...this.clients.values()];
    try {
      await mkdir(CONFIG_DIR, { recursive: true });
      await writeFile(CONFIG_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (err) {
      log.error('Failed to save snapclient config', { error: String(err) });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toStatus(config: SnapclientConfig): SnapclientStatus {
    const proc = this.processes.get(config.id);
    return {
      ...config,
      running: !!proc && !proc.killed,
      pid: proc?.pid ?? null,
    };
  }
}
