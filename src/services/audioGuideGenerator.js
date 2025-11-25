// audioGuideGenerator.js - Orchestrates the audio guide generation pipeline

import { generateFacts, generateScript } from './openai.js';
import { generateAudio } from './elevenlabs.js';

/**
 * Generate a complete audio guide for an attraction
 * Pipeline: attraction → facts → script → audio
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
    error: null
  };

  try {
    // Step 1: Generate facts
    onStatusChange?.('fetching_facts');
    result.facts = await generateFacts(attraction, signal);

    // Check for cancellation
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Step 2: Generate script
    onStatusChange?.('generating_script');
    result.script = await generateScript(attraction.name, result.facts, signal);

    // Check for cancellation
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Step 3: Generate audio
    onStatusChange?.('generating_audio');
    result.audioBlob = await generateAudio(result.script, signal);
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
