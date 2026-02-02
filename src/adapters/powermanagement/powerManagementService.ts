/**
 * PowerManagement Service - verbindet USB Relais mit Playback Events
 */
import type { USBRelayManager } from '@/adapters/powermanagement/usbRelayManager';
import type { PlaybackCoordinator } from '@/application/zones/PlaybackCoordinator';
import { createLogger } from '@/shared/logging/logger';

export class PowerManagementService {
  private readonly log = createLogger('PowerManagement');
  private currentZoneState = new Map<number, 'playing' | 'paused' | 'stopped'>();

  constructor(
    private readonly usbRelay: USBRelayManager,
    private readonly playbackCoordinator: PlaybackCoordinator,
  ) {}

  /**
   * Service starten - subscriben zu Playback-Events
   */
  public start(): void {
    this.log.info('PowerManagement service started');

    // Hook in PlaybackCoordinator um State-Änderungen zu erfassen
    // Dies geschieht durch Überwachung der Zone-States
    // (detaillierte Implementation folgt in bootstrap.ts)
  }

  /**
   * Wird aufgerufen wenn sich Playback-State ändert
   */
  public async handlePlaybackStateChange(
    zoneId: number,
    newState: 'playing' | 'paused' | 'stopped',
  ): Promise<void> {
    const oldState = this.currentZoneState.get(zoneId) ?? 'stopped';

    this.log.debug('Zone playback state change', {
      zoneId,
      oldState,
      newState,
    });

    this.currentZoneState.set(zoneId, newState);

    // Nur Zustand an Relais weitergeben wenn es sich wirklich geändert hat
    if (oldState !== newState) {
      await this.usbRelay.handlePlaybackStateChange(newState);
    }
  }

  /**
   * Cleanup
   */
  public async shutdown(): Promise<void> {
    this.log.info('Shutting down PowerManagement service');
    await this.usbRelay.shutdown();
  }

  /**
   * Status abrufen
   */
  public getStatus() {
    return {
      relay: this.usbRelay.getStatus(),
      zoneStates: Object.fromEntries(this.currentZoneState),
    };
  }
}
