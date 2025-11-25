# API Contract: ElevenLabs Text-to-Speech
*Path: kitty-specs/001-interactive-audio-tour/contracts/elevenlabs-api.md*

## Overview

Convert audio guide scripts to natural-sounding speech using ElevenLabs TTS API.

## Endpoint

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

## Authentication

```
xi-api-key: {ELEVENLABS_API_KEY}
```

API key injected via Vite environment variable: `import.meta.env.VITE_ELEVENLABS_API_KEY`

---

## Request

### Headers
```
Content-Type: application/json
xi-api-key: {ELEVENLABS_API_KEY}
Accept: audio/mpeg
```

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `voice_id` | string | ElevenLabs voice identifier |

### Default Voice
Use "Rachel" voice: `21m00Tcm4TlvDq8ikWAM`

Alternative voices:
- "Domi" (female, young): `AZnzlk1XvdvUeBnXmlld`
- "Bella" (female, soft): `EXAVITQu4vr4xnSDxMaL`
- "Adam" (male, deep): `pNInz6obpgDQGcFmaJgB`
- "Antoni" (male, warm): `ErXwobaYiN019PkySvjV`

### Body
```json
{
  "text": "Welcome to the magnificent Eiffel Tower...",
  "model_id": "eleven_monolingual_v1",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": true
  }
}
```

### Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | required | Text to convert (max 5000 chars) |
| `model_id` | string | `eleven_monolingual_v1` | TTS model |
| `voice_settings.stability` | number | 0.5 | Voice consistency (0-1) |
| `voice_settings.similarity_boost` | number | 0.75 | Voice clarity (0-1) |
| `voice_settings.style` | number | 0.0 | Style exaggeration (0-1) |
| `voice_settings.use_speaker_boost` | boolean | true | Enhance speaker clarity |

---

## Response

### Success (200 OK)
Returns raw audio data as `audio/mpeg` (MP3 format).

**Content-Type:** `audio/mpeg`

The response body is binary MP3 data, not JSON.

---

## JavaScript Implementation

```javascript
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

async function generateAudio(script) {
  const response = await fetch(
    `${ELEVENLABS_ENDPOINT}/${DEFAULT_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
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
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail?.message ||
      error.detail ||
      `ElevenLabs API error: ${response.status}`
    );
  }

  // Return as Blob for audio playback
  return response.blob();
}

// Create playable audio element from blob
function createAudioFromBlob(audioBlob) {
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio();
  audio.src = url;

  // Clean up blob URL when audio is done
  audio.onended = () => {
    URL.revokeObjectURL(url);
  };

  return { audio, url };
}
```

---

## Error Handling

### Error Response Format
```json
{
  "detail": {
    "status": "error",
    "message": "Description of what went wrong"
  }
}
```

Or simple string:
```json
{
  "detail": "Invalid API key"
}
```

### Common Errors

| Status | Description | Action |
|--------|-------------|--------|
| 401 | Invalid API key | Check VITE_ELEVENLABS_API_KEY |
| 400 | Invalid request (text too long, invalid voice) | Validate input |
| 422 | Unprocessable entity | Check text content |
| 429 | Rate limit / quota exceeded | Backoff or notify user |
| 500 | Server error | Retry with backoff |

---

## Audio Playback Integration

```javascript
// Complete flow: script → audio → playback
async function playAudioGuide(script, onProgress) {
  onProgress?.('generating_audio');

  const audioBlob = await generateAudio(script);
  const { audio, url } = createAudioFromBlob(audioBlob);

  // Get duration
  await new Promise((resolve) => {
    audio.onloadedmetadata = resolve;
    audio.load();
  });

  return {
    audio,
    url,
    duration: audio.duration,
    play: () => audio.play(),
    pause: () => audio.pause(),
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
    cleanup: () => {
      audio.pause();
      URL.revokeObjectURL(url);
    }
  };
}
```

---

## iOS Chrome Considerations

```javascript
// Audio unlock for iOS (call on first user interaction)
let audioUnlocked = false;

async function unlockAudioForIOS() {
  if (audioUnlocked) return;

  // Play and immediately pause a silent audio
  const audio = new Audio();
  audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYHO0JJAAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEAAQB4HXuDzgABCgqsA5lGIABhYxBTBz4PoOwMABgEAEHMABjAGPg+QBg//tYZAkAA1YxSgU94AI1BWigqCABAAAAAPcAAAAAAAAAANWMDuAxBUAAAB//9AAAAAAwAAAAAwAAAADgAAAAMAAAAA4ABAACAAAJmAAAAAAAAAAAbgEEEEE=';

  try {
    await audio.play();
    audio.pause();
    audioUnlocked = true;
  } catch (e) {
    console.warn('Audio unlock failed:', e);
  }
}

// Call on attraction click before starting generation
async function handleAttractionClick(attraction) {
  await unlockAudioForIOS(); // Unlock within user gesture
  // ... proceed with audio generation
}
```

---

## Cost Estimation

Using ElevenLabs Starter plan pricing:
- ~$0.30 per 1,000 characters

**Per attraction (80-150 word script):**
- Average script: ~600 characters
- **Estimated cost: ~$0.18 per attraction**

**Free tier:** 10,000 characters/month (~16 audio guides)

---

## Character Limits

| Plan | Monthly Characters |
|------|--------------------|
| Free | 10,000 |
| Starter | 30,000 |
| Creator | 100,000 |

Script length guideline: Keep under 1000 characters per generation for consistent quality.
