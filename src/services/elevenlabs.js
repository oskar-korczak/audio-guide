// elevenlabs.js - ElevenLabs TTS client

const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - clear and professional

/**
 * Get ElevenLabs API key from environment
 * @returns {string}
 * @throws {Error} If key not configured
 */
function getApiKey() {
  const key = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('VITE_ELEVENLABS_API_KEY not configured');
  }
  return key;
}

/**
 * Generate audio from script text
 * @param {string} script - Text to convert to speech
 * @param {AbortSignal} signal - AbortController signal
 * @returns {Promise<Blob>} Audio blob (MP3)
 */
export async function generateAudio(script, signal) {
  const response = await fetch(
    `${ELEVENLABS_ENDPOINT}/${DEFAULT_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': getApiKey(),
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
      signal
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail?.message || error.detail || `ElevenLabs API error: ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return response.blob();
}

export { DEFAULT_VOICE_ID };
