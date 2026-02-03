/**
 * Audio adapter module - Device discovery and scanning.
 */

export { AudioDeviceScanner, getAudioDeviceScanner } from '@/adapters/audio/audioDeviceScanner';
export type { AudioDevice, AudioChannel } from '@/adapters/audio/audioDeviceScanner';
export {
  SqueezelitePlayerScanner,
  createSqueezelitePlayerScanner,
} from '@/adapters/audio/squeezelitePlayerScanner';
export type { SqueezelitePlayer } from '@/adapters/audio/squeezelitePlayerScanner';
