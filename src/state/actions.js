// actions.js - State actions for application logic

import { setState, getState, setAudioStatus, resetAudioState, isAudioReady } from './AppState.js';
import { rlog } from '../utils/remoteLogger.js';
import { generateAudioGuide, cleanupAudioGuide } from '../services/audioGuideGenerator.js';
import { cleanup as cleanupAudio, unlockAudio } from '../services/audio.js';
import { setMarkerSelected, setMarkerGenerating, removeAttractionMarker, addAttractionMarker } from '../components/AttractionMarker.js';
import { hideAudioPlayer } from '../components/AudioPlayer.js';
import { getMap } from '../components/Map.js';
import { showWarning } from '../components/ErrorMessage.js';

let abortController = null;

/**
 * Select an attraction and start audio generation
 * @param {Object} attraction - Attraction to select
 * @returns {Promise<Object|null>} Generated audio guide or null if cancelled
 */
export async function selectAttraction(attraction) {
  rlog.info('selectAttraction called:', attraction.id);
  const currentState = getState();

  // Unlock audio on first interaction (iOS requirement)
  rlog.info('Unlocking audio...');
  const unlocked = await unlockAudio();
  rlog.info('Audio unlocked:', unlocked);

  // If clicking same attraction that's ready/playing, don't regenerate
  if (currentState.selectedAttractionId === attraction.id && isAudioReady()) {
    rlog.info('Same attraction already ready, returning existing');
    return currentState.currentAudioGuide;
  }

  // Deselect previous marker
  if (currentState.selectedAttractionId) {
    setMarkerSelected(currentState.selectedAttractionId, false);
    setMarkerGenerating(currentState.selectedAttractionId, false);
  }

  // Cancel any in-progress generation
  if (abortController) {
    rlog.info('Aborting previous generation');
    abortController.abort();
    abortController = null;
  }

  // Cleanup previous audio
  hideAudioPlayer();
  cleanupAudio();
  if (currentState.currentAudioGuide) {
    cleanupAudioGuide(currentState.currentAudioGuide);
  }

  // Reset audio state
  resetAudioState();

  // Set new selection
  setState({ selectedAttractionId: attraction.id });
  setMarkerSelected(attraction.id, true);
  setMarkerGenerating(attraction.id, true);

  // Start generation
  abortController = new AbortController();
  rlog.info('Starting audio generation...');

  try {
    const audioGuide = await generateAudioGuide(
      attraction,
      (status) => {
        rlog.info('Generation status:', status);
        setAudioStatus(status);
      },
      abortController.signal
    );

    rlog.info('Generation complete, audioGuide:', !!audioGuide);
    setMarkerGenerating(attraction.id, false);
    setState({ currentAudioGuide: audioGuide });
    setAudioStatus('ready');

    // Show warning if location data was unavailable
    if (audioGuide.locationWarning) {
      showWarning({ message: audioGuide.locationWarning });
    }

    return audioGuide;

  } catch (error) {
    rlog.error('Generation error:', error.name, error.message);
    setMarkerGenerating(attraction.id, false);

    if (error.name === 'AbortError') {
      // Selection changed, ignore
      rlog.info('Aborted - selection changed');
      return null;
    }

    setState({ error: { type: 'audio_generation', message: error.message, retryable: true } });
    setAudioStatus('error');
    throw error;
  }
}

/**
 * Cancel current selection and reset state
 */
export function cancelSelection() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  const currentState = getState();
  if (currentState.selectedAttractionId) {
    setMarkerSelected(currentState.selectedAttractionId, false);
    setMarkerGenerating(currentState.selectedAttractionId, false);
  }

  hideAudioPlayer();
  cleanupAudio();
  if (currentState.currentAudioGuide) {
    cleanupAudioGuide(currentState.currentAudioGuide);
  }

  resetAudioState();
  setState({ selectedAttractionId: null });
}

/**
 * Update attractions with diff-based marker management
 * @param {Array} newAttractions - New attractions list
 * @param {Function} onAttractionClick - Click handler for markers
 */
export function updateAttractions(newAttractions, onAttractionClick) {
  const currentState = getState();
  const currentIds = new Set(currentState.attractions.map(a => a.id));
  const newIds = new Set(newAttractions.map(a => a.id));

  // Remove markers for attractions no longer in view
  currentState.attractions.forEach(attraction => {
    if (!newIds.has(attraction.id)) {
      removeAttractionMarker(attraction.id);
    }
  });

  // Add markers for new attractions
  const map = getMap();
  newAttractions.forEach(attraction => {
    if (!currentIds.has(attraction.id)) {
      addAttractionMarker(map, attraction, () => onAttractionClick(attraction));
    }
  });

  // Preserve selection state
  if (currentState.selectedAttractionId && newIds.has(currentState.selectedAttractionId)) {
    setMarkerSelected(currentState.selectedAttractionId, true);
  }

  setState({ attractions: newAttractions });
}

/**
 * Set loading state for attractions
 * @param {boolean} loading - Whether loading is in progress
 */
export function setAttractionsLoading(loading) {
  setState({ isLoadingAttractions: loading });
}
