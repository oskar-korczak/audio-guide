// audioGuideGenerator.js - Orchestrates the audio guide generation pipeline
// Updated to use backend API instead of direct OpenAI/ElevenLabs calls

import { generateAudioGuide as fetchAudioFromBackend } from './audioApi.js';

/**
 * Generate a complete audio guide for an attraction
 * Now uses a single backend call instead of multiple API calls
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
    facts: null,      // No longer available (generated on backend)
    script: null,     // No longer available (generated on backend)
    audioBlob: null,
    audioUrl: null,
    error: null
  };

  try {
    // Single status for entire backend call
    onStatusChange?.('generating_audio');

    // Call backend API (handles facts → script → audio internally)
    result.audioBlob = await fetchAudioFromBackend(attraction, signal);
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
