// audioGuideGenerator.js - Orchestrates the audio guide generation pipeline
// Now uses backend Cloud Function instead of direct API calls

import { getSelectedLanguage } from '../state/AppState.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://us-central1-prompt-compressor-1.cloudfunctions.net/generate-audio';

/**
 * Generate a complete audio guide for an attraction
 * Calls backend Cloud Function which handles: facts → script → audio
 *
 * @param {Object} attraction - Attraction object
 * @param {Function} onStatusChange - Called with status updates
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @returns {Promise<Object>} Audio guide result
 */
export async function generateAudioGuide(attraction, onStatusChange, signal) {
  const result = {
    attractionId: attraction.id,
    attractionName: attraction.name,
    facts: null,
    script: null,
    audioBlob: null,
    audioUrl: null,
    error: null,
    locationWarning: null
  };

  try {
    onStatusChange?.('generating_audio');

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: attraction.name,
        category: attraction.category || 'attraction',
        latitude: attraction.lat,
        longitude: attraction.lon,
        language: getSelectedLanguage()
      }),
      signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Backend error: ${response.status}`);
    }

    // Check for location warning header
    const locationWarning = response.headers.get('X-Location-Warning');
    if (locationWarning) {
      result.locationWarning = locationWarning;
    }

    result.audioBlob = await response.blob();
    result.audioUrl = URL.createObjectURL(result.audioBlob);

    onStatusChange?.('ready');
    return result;

  } catch (error) {
    if (error.name === 'AbortError') {
      onStatusChange?.('idle');
      throw error;
    }

    result.error = error.message;
    onStatusChange?.('error');
    throw error;
  }
}

/**
 * Cleanup audio guide resources (revoke blob URL)
 * @param {Object} audioGuide - Audio guide result object
 */
export function cleanupAudioGuide(audioGuide) {
  if (audioGuide?.audioUrl) {
    URL.revokeObjectURL(audioGuide.audioUrl);
  }
}
