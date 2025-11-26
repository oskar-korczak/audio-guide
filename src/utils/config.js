// config.js - Environment variable access helper

/**
 * Get all configuration values
 * @returns {Object} Config object
 */
export function getConfig() {
  return {
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    elevenlabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || ''
  };
}

/**
 * Validate that required environment variables are set
 * @returns {Object} Validation result with valid boolean and missing array
 */
export function validateConfig() {
  const config = getConfig();
  const missing = [];

  if (!config.openaiApiKey) missing.push('VITE_OPENAI_API_KEY');
  if (!config.elevenlabsApiKey) missing.push('VITE_ELEVENLABS_API_KEY');

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Missing environment variables: ${missing.join(', ')}`
    };
  }

  return { valid: true };
}
