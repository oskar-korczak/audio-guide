// audio.js - Audio playback service with iOS Chrome compatibility

import { rlog } from '../utils/remoteLogger.js';

let currentAudio = null;
let currentUrl = null;
let audioUnlocked = false;

/**
 * Unlock iOS audio context on first user interaction
 * MUST be called from a user gesture (click) context
 * @returns {Promise<boolean>} Whether unlock succeeded
 */
export async function unlockAudio() {
  if (audioUnlocked) {
    rlog.info('Audio already unlocked');
    return true;
  }

  rlog.info('Attempting audio unlock...');

  try {
    // Create audio context approach (more reliable on iOS)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      rlog.info('AudioContext state:', ctx.state);

      if (ctx.state === 'suspended') {
        await ctx.resume();
        rlog.info('AudioContext resumed');
      }

      // Play a tiny buffer
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      rlog.info('Silent buffer played');
    }

    audioUnlocked = true;
    rlog.info('Audio unlock SUCCESS');
    return true;
  } catch (error) {
    rlog.error('Audio unlock failed:', error.message);
    // Still mark as unlocked to not block - we'll handle errors at playback time
    audioUnlocked = true;
    return false;
  }
}

/**
 * Check if audio has been unlocked
 * @returns {boolean}
 */
export function isAudioUnlocked() {
  return audioUnlocked;
}

/**
 * Create an audio player for a blob URL
 * @param {string} blobUrl - Blob URL for the audio
 * @returns {Object} Audio player interface
 */
export function createAudioPlayer(blobUrl) {
  // Cleanup previous
  cleanup();

  currentUrl = blobUrl;
  currentAudio = new Audio();
  currentAudio.src = blobUrl;

  return {
    audio: currentAudio,
    play: () => play(),
    pause: () => pause(),
    stop: () => stop(),
    getDuration: () => getDuration(),
    getCurrentTime: () => currentAudio?.currentTime || 0,
    isPlaying: () => isPlaying(),
    onEnded: (callback) => {
      if (currentAudio) {
        currentAudio.addEventListener('ended', callback);
      }
    },
    onTimeUpdate: (callback) => {
      if (currentAudio) {
        currentAudio.addEventListener('timeupdate', callback);
      }
    }
  };
}

/**
 * Play the current audio
 * @returns {Promise<boolean>} Whether playback started
 */
async function play() {
  if (!currentAudio) return false;
  try {
    await currentAudio.play();
    return true;
  } catch (error) {
    console.error('Playback failed:', error);
    return false;
  }
}

/**
 * Pause the current audio
 */
function pause() {
  if (currentAudio) {
    currentAudio.pause();
  }
}

/**
 * Stop and reset the current audio
 */
function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
}

/**
 * Check if audio is currently playing
 * @returns {boolean}
 */
function isPlaying() {
  return currentAudio && !currentAudio.paused && !currentAudio.ended;
}

/**
 * Get audio duration (waits for metadata if needed)
 * @returns {Promise<number>} Duration in seconds
 */
async function getDuration() {
  if (!currentAudio) return 0;

  // Wait for metadata if not loaded
  if (currentAudio.readyState < 1) {
    await new Promise((resolve) => {
      currentAudio.addEventListener('loadedmetadata', resolve, { once: true });
      currentAudio.load();
    });
  }

  return currentAudio.duration;
}

/**
 * Cleanup current audio and revoke blob URL
 */
export function cleanup() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

/**
 * Get the current player interface (if exists)
 * @returns {Object|null} Player interface or null
 */
export function getCurrentPlayer() {
  return currentAudio ? {
    play: () => play(),
    pause: () => pause(),
    isPlaying: () => isPlaying()
  } : null;
}
