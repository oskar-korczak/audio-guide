// openai.js - OpenAI API client for facts and script generation

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * Get OpenAI API key from environment
 * @returns {string}
 * @throws {Error} If key not configured
 */
function getApiKey() {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    throw new Error('VITE_OPENAI_API_KEY not configured');
  }
  return key;
}

/**
 * Make a chat completion request to OpenAI
 * @param {Array<{role: string, content: string}>} messages - Chat messages
 * @param {Object} options - Options (maxTokens, temperature, signal)
 * @returns {Promise<string>} Assistant message content
 */
async function chatCompletion(messages, options = {}) {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7
    }),
    signal: options.signal
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error?.message || `OpenAI API error: ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.code = error.error?.code;
    throw err;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generate interesting facts about an attraction
 * @param {Object} attraction - Attraction object
 * @param {AbortSignal} signal - AbortController signal
 * @returns {Promise<string>} Facts text
 */
export async function generateFacts(attraction, signal) {
  const systemPrompt = 'You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists.';

  const userPrompt = `Provide 3-5 interesting facts about "${attraction.name}" (${attraction.category}) located at coordinates ${attraction.latitude}, ${attraction.longitude}. Focus on:
- Historical significance
- Architectural features
- Cultural importance
- Interesting stories or legends

Be concise but engaging. Each fact should be 1-2 sentences.`;

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { maxTokens: 500, temperature: 0.7, signal }
  );
}

/**
 * Generate TTS-optimized narration script
 * @param {string} attractionName - Name of the attraction
 * @param {string} facts - Facts text from generateFacts
 * @param {AbortSignal} signal - AbortController signal
 * @returns {Promise<string>} Script text
 */
export async function generateScript(attractionName, facts, signal) {
  const systemPrompt = 'You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references like "as you can see". Use clear pronunciation-friendly language.';

  const userPrompt = `Write a 30-60 second audio guide script for "${attractionName}" based on these facts:

${facts}

Requirements:
- Start with a warm welcome mentioning the attraction name
- Share 2-3 of the most interesting facts naturally
- Use conversational, engaging language
- End with an invitation to explore or take photos
- Keep it between 80-150 words for optimal audio length`;

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { maxTokens: 300, temperature: 0.8, signal }
  );
}

export { chatCompletion };
