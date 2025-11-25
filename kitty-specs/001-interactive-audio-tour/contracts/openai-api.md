# API Contract: OpenAI Chat Completions (Content Generation)
*Path: kitty-specs/001-interactive-audio-tour/contracts/openai-api.md*

## Overview

Generate factual content and audio guide scripts using OpenAI's Chat Completions API.

## Endpoint

```
POST https://api.openai.com/v1/chat/completions
```

## Authentication

```
Authorization: Bearer {OPENAI_API_KEY}
```

API key injected via Vite environment variable: `import.meta.env.VITE_OPENAI_API_KEY`

---

## Step 1: Generate Facts

### Request
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists."
    },
    {
      "role": "user",
      "content": "Provide 3-5 interesting facts about \"{{attraction_name}}\" ({{category}}) located at coordinates {{latitude}}, {{longitude}}. Focus on:\n- Historical significance\n- Architectural features\n- Cultural importance\n- Interesting stories or legends\n\nBe concise but engaging. Each fact should be 1-2 sentences."
    }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}
```

### Response
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "1. The Eiffel Tower was built in 1889 as the entrance arch for the World's Fair, celebrating the 100th anniversary of the French Revolution.\n\n2. Originally intended as a temporary structure, the tower was almost demolished in 1909 but was saved because of its usefulness as a radio transmission tower.\n\n3. The tower was the world's tallest man-made structure for 41 years until the Chrysler Building was completed in New York in 1930.\n\n4. Gustave Eiffel, the tower's designer, included a private apartment at the top where he entertained guests like Thomas Edison."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 85,
    "completion_tokens": 150,
    "total_tokens": 235
  }
}
```

---

## Step 2: Generate Audio Script

### Request
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references like 'as you can see'. Use clear pronunciation-friendly language."
    },
    {
      "role": "user",
      "content": "Write a 30-60 second audio guide script for \"{{attraction_name}}\" based on these facts:\n\n{{facts}}\n\nRequirements:\n- Start with a warm welcome mentioning the attraction name\n- Share 2-3 of the most interesting facts naturally\n- Use conversational, engaging language\n- End with an invitation to explore or take photos\n- Keep it between 80-150 words for optimal audio length"
    }
  ],
  "max_tokens": 300,
  "temperature": 0.8
}
```

### Response
```json
{
  "id": "chatcmpl-def456",
  "object": "chat.completion",
  "created": 1700000001,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Welcome to the magnificent Eiffel Tower, one of the world's most recognizable landmarks.\n\nThis iron lattice masterpiece was constructed in 1889 for the World's Fair, marking the centennial of the French Revolution. Here's something fascinating: it was only meant to stand for twenty years! The tower was saved from demolition because it proved invaluable as a radio transmission antenna.\n\nAt the time of its completion, the Eiffel Tower was the tallest structure ever built, holding that record for over four decades. Its designer, Gustave Eiffel, even had a private apartment at the very top where he once hosted the famous inventor Thomas Edison.\n\nTake a moment to admire this engineering marvel, and perhaps capture some photos to remember your visit."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 200,
    "completion_tokens": 175,
    "total_tokens": 375
  }
}
```

---

## JavaScript Implementation

```javascript
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

async function generateFacts(attraction) {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists.'
        },
        {
          role: 'user',
          content: `Provide 3-5 interesting facts about "${attraction.name}" (${attraction.category}) located at coordinates ${attraction.latitude}, ${attraction.longitude}. Focus on historical significance, architectural features, cultural importance, and interesting stories. Be concise but engaging.`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate facts');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateScript(attractionName, facts) {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references. Use clear pronunciation-friendly language.'
        },
        {
          role: 'user',
          content: `Write a 30-60 second audio guide script for "${attractionName}" based on these facts:\n\n${facts}\n\nStart with a warm welcome, share 2-3 interesting facts naturally, and end with an invitation to explore. Keep it between 80-150 words.`
        }
      ],
      max_tokens: 300,
      temperature: 0.8
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate script');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## Error Handling

### Common Errors

| Status | Error Type | Description | Action |
|--------|------------|-------------|--------|
| 401 | `invalid_api_key` | Invalid or missing API key | Check VITE_OPENAI_API_KEY |
| 429 | `rate_limit_exceeded` | Too many requests | Exponential backoff |
| 500 | `server_error` | OpenAI server error | Retry with backoff |
| 503 | `service_unavailable` | Service temporarily unavailable | Retry |

### Error Response Format
```json
{
  "error": {
    "message": "You exceeded your current quota...",
    "type": "insufficient_quota",
    "param": null,
    "code": "insufficient_quota"
  }
}
```

---

## Cost Estimation

Using `gpt-4o-mini` pricing (as of Jan 2025):
- Input: ~$0.15 / 1M tokens
- Output: ~$0.60 / 1M tokens

**Per attraction:**
- Facts generation: ~85 input + ~150 output tokens
- Script generation: ~200 input + ~175 output tokens
- **Total: ~285 input + ~325 output tokens**
- **Estimated cost: ~$0.0002 per attraction** (fractions of a cent)
