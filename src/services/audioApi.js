// audioApi.js - Backend API client for audio generation
// This replaces direct calls to openai.js and elevenlabs.js

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

/**
 * Generate audio guide from attraction data
 * @param {Object} attraction - Attraction with name, category, latitude, longitude
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @returns {Promise<Blob>} MP3 audio blob
 */
export async function generateAudioGuide(attraction, signal) {
  const response = await fetch(`${BACKEND_URL}/generate-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: attraction.name,
      category: attraction.category,
      latitude: attraction.latitude,
      longitude: attraction.longitude
    }),
    signal
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Backend error: ${response.status}`);
  }

  return response.blob();
}

/**
 * Check backend health
 * @returns {Promise<boolean>} true if backend is healthy
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export { BACKEND_URL };
