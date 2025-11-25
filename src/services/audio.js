// audio.js - Audio playback service with iOS Chrome compatibility

let currentAudio = null;
let currentUrl = null;
let audioUnlocked = false;

// Tiny silent MP3 for iOS audio unlock
const SILENT_AUDIO = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYHO0JJAAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEAAQB4HXuDzgABCgqsA5lGIABhYxBTBz4PoOwMABgEAEHMABjAGPg+QBg//tYZAkAA1YxSgU94AI1BWigqCABAAAAAPcAAAAAAAAAANWMDuAxBUAAAB//9AAAAAAwAAAAAwAAAADgAAAAMAAAAA4ABAACAAAJmAAAAAAAAAAAbgEEEEE=';

/**
 * Unlock iOS audio context on first user interaction
 * MUST be called from a user gesture (click) context
 * @returns {Promise<boolean>} Whether unlock succeeded
 */
export async function unlockAudio() {
  if (audioUnlocked) return true;

  try {
    const audio = new Audio();
    audio.src = SILENT_AUDIO;
    audio.volume = 0.01; // Nearly silent

    await audio.play();
    audio.pause();
    audio.src = '';

    audioUnlocked = true;
    console.log('Audio unlocked for iOS');
    return true;
  } catch (error) {
    console.warn('Audio unlock failed:', error);
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
