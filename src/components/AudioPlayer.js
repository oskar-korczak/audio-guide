// AudioPlayer.js - Play/pause UI component for audio guides

import { getCurrentPlayer } from '../services/audio.js';

let playerElement = null;
let isPlaying = false;
let hasPlayed = false;
let hasEnded = false;

/**
 * Show the audio player UI
 * @param {string} attractionName - Name of the attraction
 * @param {Function} onPlayPause - Callback for play/pause events
 */
export function showAudioPlayer(attractionName, onPlayPause) {
  if (!playerElement) {
    playerElement = document.createElement('div');
    playerElement.className = 'audio-player';
    document.body.appendChild(playerElement);
  }

  isPlaying = false;
  hasPlayed = false;
  hasEnded = false;
  updatePlayerUI(attractionName);
  playerElement.style.display = 'flex';

  // Store callback for play/pause
  playerElement.dataset.attractionName = attractionName;
  window._audioPlayerCallback = onPlayPause;
}

/**
 * Update the player UI with current state
 * @param {string} attractionName - Name of the attraction
 */
function updatePlayerUI(attractionName) {
  playerElement.innerHTML = `
    <div class="player-info">
      <div class="player-title">${attractionName}</div>
      <div class="player-status">${getStatusText()}</div>
    </div>
    <button class="play-pause-btn" onclick="window.toggleAudioPlayback()">
      ${isPlaying ? getPauseIcon() : getPlayIcon()}
    </button>
  `;
}

/**
 * Get status text based on current state
 * @returns {string}
 */
function getStatusText() {
  if (isPlaying) return 'Playing...';
  if (hasEnded) return 'Tap to replay';
  if (hasPlayed) return 'Paused';
  return 'Tap to play';
}

/**
 * Hide the audio player UI
 */
export function hideAudioPlayer() {
  if (playerElement) {
    playerElement.style.display = 'none';
  }
}

/**
 * Update playing state and refresh UI
 * @param {boolean} playing - Whether audio is playing
 */
export function setPlayingState(playing) {
  isPlaying = playing;
  if (playing) {
    hasPlayed = true;
    hasEnded = false;
  }
  if (playerElement) {
    const name = playerElement.dataset.attractionName || 'Audio Guide';
    updatePlayerUI(name);
  }
}

/**
 * Mark audio as ended (for replay state)
 */
export function setAudioEnded() {
  hasEnded = true;
  isPlaying = false;
  if (playerElement) {
    const name = playerElement.dataset.attractionName || 'Audio Guide';
    updatePlayerUI(name);
  }
}

// Global toggle function for button click
window.toggleAudioPlayback = () => {
  const player = getCurrentPlayer();
  if (!player) return;

  if (player.isPlaying()) {
    player.pause();
    setPlayingState(false);
  } else {
    player.play();
    setPlayingState(true);
  }

  window._audioPlayerCallback?.(!isPlaying);
};

/**
 * Get play icon SVG
 * @returns {string} SVG HTML
 */
function getPlayIcon() {
  return `
    <svg viewBox="0 0 24 24" width="32" height="32">
      <path d="M8 5v14l11-7z" fill="white"/>
    </svg>
  `;
}

/**
 * Get pause icon SVG
 * @returns {string} SVG HTML
 */
function getPauseIcon() {
  return `
    <svg viewBox="0 0 24 24" width="32" height="32">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="white"/>
    </svg>
  `;
}
