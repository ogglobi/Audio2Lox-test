import { createLogger } from '@/shared/logging/logger';
import type { SqueezeliteCore } from '@/adapters/outputs/squeezelite/squeezeliteCore';

/**
 * Information about an available Squeezelite/SlimProto player.
 */
export interface SqueezelitePlayer {
  id: string; // Player ID/MAC address
  name: string; // Player name
  ip?: string; // Player IP address
  port?: number; // SlimProto port
  isLocal?: boolean; // Whether it's a local player we're hosting
}

/**
 * Scans and discovers available Squeezelite players.
 */
export class SqueezelitePlayerScanner {
  private readonly log = createLogger('Audio', 'SqueezeliteScanner');

  constructor(private readonly squeezeliteCore: SqueezeliteCore) {}

  /**
   * Get all available Squeezelite players.
   */
  async getAvailablePlayers(): Promise<SqueezelitePlayer[]> {
    try {
      return await this.discoverPlayers();
    } catch (error) {
      this.log.warn('Failed to discover Squeezelite players', { error: String(error) });
      return [];
    }
  }

  /**
   * Get a specific player by ID/MAC address.
   */
  async getPlayer(playerId: string): Promise<SqueezelitePlayer | null> {
    const players = await this.getAvailablePlayers();
    return players.find((p) => p.id.toLowerCase() === playerId.toLowerCase()) || null;
  }

  /**
   * Internal discovery implementation.
   */
  private async discoverPlayers(): Promise<SqueezelitePlayer[]> {
    const players: SqueezelitePlayer[] = [];

    // Get players from SqueezeliteCore
    try {
      const slimPlayers = this.squeezeliteCore.players || [];
      for (const player of slimPlayers) {
        if (player.deviceAddress) {
          players.push({
            id: player.deviceAddress, // MAC address
            name: player.name || `Player ${player.deviceAddress}`,
            isLocal: true, // All players through SqueezeliteCore are hosted by us
          });
        }
      }
    } catch (error) {
      this.log.debug('Could not query SqueezeliteCore players', { error: String(error) });
    }

    // If no players found, add a template for configuration
    if (players.length === 0) {
      players.push({
        id: 'aa:bb:cc:dd:ee:ff',
        name: 'Squeezelite Player (Example)',
        isLocal: true,
      });
    }

    return players;
  }
}

/**
 * Factory function to create a player scanner.
 */
export function createSqueezelitePlayerScanner(
  squeezeliteCore: SqueezeliteCore,
): SqueezelitePlayerScanner {
  return new SqueezelitePlayerScanner(squeezeliteCore);
}
