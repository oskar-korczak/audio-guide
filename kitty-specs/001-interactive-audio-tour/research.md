# Research: Interactive Audio Tour Guide
*Path: kitty-specs/001-interactive-audio-tour/research.md*

**Feature Branch**: `001-interactive-audio-tour`
**Date**: 2025-11-25

## Research Summary

This document captures technical decisions and findings from Phase 0 research to inform implementation.

---

## 1. Leaflet iOS Chrome Compatibility

### Decision
Use Leaflet 1.9.x with Leaflet.GestureHandling plugin and OpenStreetMap tiles.

### Rationale
- Leaflet has built-in touch gesture support (pan, pinch-zoom)
- Lightweight (42KB) suitable for mobile
- GestureHandling plugin prevents page zoom vs map zoom conflicts

### Alternatives Considered
- **MapLibre GL JS**: Vector tiles, better animations, but larger bundle and more complexity
- **OpenLayers**: Feature-rich but heavier, overkill for this use case

### Key Implementation Notes

**Required viewport meta tag:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

**Gotchas:**
- Chrome on iOS uses WebKit (same engine as Safari) - all Safari bugs apply
- Multiple tile layers can crash iOS browsers - use `L_DISABLE_3D=true` if issues occur
- Tile loading can momentarily freeze interactions
- Keep marker count reasonable (<100) or use clustering

**Recommended Leaflet config:**
```javascript
const map = L.map('map', {
  gestureHandling: true,  // requires plugin
  tap: true,
  touchZoom: true,
  dragging: true
});
```

---

## 2. Device Orientation API (Compass Heading)

### Decision
Use `webkitCompassHeading` on iOS with permission request flow, fallback gracefully if unavailable.

### Rationale
- Standard `alpha` property does NOT provide true compass heading on iOS
- `webkitCompassHeading` gives magnetic north-based readings (0-360)
- iOS 13+ requires explicit permission via user gesture

### Implementation Pattern

```javascript
async function initCompass(onHeadingUpdate) {
  if (!window.DeviceOrientationEvent) {
    console.warn('DeviceOrientation not supported');
    return false;
  }

  // iOS 13+ permission request (must be from user gesture)
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    } catch (error) {
      console.error('Compass permission failed:', error);
      return false;
    }
  }

  function handleOrientation(event) {
    // iOS: use webkitCompassHeading (true compass)
    // Android: convert alpha (360 - alpha)
    const heading = event.webkitCompassHeading ??
                    (event.alpha ? 360 - event.alpha : null);
    if (heading !== null) {
      onHeadingUpdate(heading);
    }
  }

  window.addEventListener('deviceorientation', handleOrientation, true);
  return true;
}
```

**Gotchas:**
- Permission request MUST be triggered by user interaction (button click)
- Requires HTTPS in production
- If user denies, they must manually clear site data to re-prompt
- Some devices report API support but have no compass sensor

### Fallback Strategy
- Show static arrow (north-facing) if compass unavailable
- Display message: "Enable compass for direction tracking"
- App remains functional without heading - just loses directional arrow rotation

---

## 3. Overpass API for Tourist Attractions

### Decision
Use Overpass API public endpoint with union query for tourism/historic/amenity tags.

### Rationale
- Free, no API key required
- Comprehensive OSM data for tourist attractions
- JSON output with coordinates and tags

### API Endpoint
```
https://overpass-api.de/api/interpreter
```

### Query Pattern

```overpass
[out:json][timeout:25];
(
  nwr["tourism"~"museum|attraction|gallery|viewpoint|artwork|information"]({{bbox}});
  nwr["historic"]({{bbox}});
  nwr["amenity"="place_of_worship"]({{bbox}});
);
out center;
```

**Bounding box format:** `(south, west, north, east)` - e.g., `(50.7,7.1,50.8,7.2)`

### Response Structure
```json
{
  "elements": [
    {
      "type": "node",
      "id": 123456,
      "lat": 50.75,
      "lon": 7.15,
      "tags": {
        "name": "Historic Cathedral",
        "tourism": "attraction"
      }
    }
  ]
}
```

**Key fields:**
- `lat`, `lon`: Coordinates
- `tags.name`: Attraction name
- `tags.tourism` / `tags.historic`: Category

### Rate Limiting
- Default timeout: 180 seconds
- HTTP 429 when rate limited
- Implement exponential backoff on failures
- Cache results to minimize requests (debounce map movements)

**Gotchas:**
- Use `out center` to get coordinates for ways/relations (not just nodes)
- Tag keys/values are case-sensitive
- Not all attractions have `name` tag - filter these out
- Bounding box order is `(south, west, north, east)` NOT lat/lon pairs

---

## 4. iOS Chrome Audio Autoplay

### Decision
Use HTMLAudioElement with Blob URLs (audio/mpeg), initialize on first user click.

### Rationale
- Base64 data URIs fail on iOS Safari/Chrome
- Blob URLs with `audio/mpeg` MIME type work reliably
- HTMLAudioElement more stable than Web Audio API for basic playback

### Implementation Pattern

```javascript
// Store audio unlock state
let audioUnlocked = false;

// Call on first user interaction (e.g., clicking an attraction)
async function unlockAudio() {
  if (audioUnlocked) return;

  // Create and play silent audio to unlock
  const audio = new Audio();
  audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10...'; // tiny silent wav
  try {
    await audio.play();
    audio.pause();
    audioUnlocked = true;
  } catch (e) {
    console.warn('Audio unlock failed:', e);
  }
}

// Play generated audio
async function playAudio(audioData) {
  const blob = new Blob([audioData], { type: 'audio/mpeg' });
  const audio = new Audio();
  audio.src = URL.createObjectURL(blob);

  audio.onended = () => {
    URL.revokeObjectURL(audio.src);
  };

  await audio.play();
  return audio;
}
```

**Gotchas:**
- Must use `audio/mpeg` MIME type (audio/wav, audio/webm don't work on iOS)
- First play must be from genuine user click (not programmatic)
- Unlock audio context on first attraction click
- Clean up blob URLs after playback to prevent memory leaks

---

## 5. ElevenLabs Text-to-Speech

### Decision
Use ElevenLabs API with streaming disabled, return MP3 format.

### Rationale
- High-quality, natural-sounding voices
- Simple REST API
- MP3 format compatible with iOS Chrome

### API Endpoint
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

### Request Format
```javascript
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'xi-api-key': ELEVENLABS_API_KEY
  },
  body: JSON.stringify({
    text: script,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5
    }
  })
});

const audioBlob = await response.blob();
```

### Voice Selection
- Use a default voice ID (e.g., "Rachel" - `21m00Tcm4TlvDq8ikWAM`)
- Can be made configurable later

---

## 6. OpenAI Content Generation

### Decision
Use OpenAI Chat Completions API with gpt-4o-mini for cost efficiency.

### Rationale
- Fast response times
- Good quality for factual content
- Cost-effective for demo/personal use

### Two-Step Generation

**Step 1: Get Facts**
```javascript
const factsPrompt = `You are a knowledgeable tour guide. Provide 3-5 interesting facts about "${attractionName}" located at coordinates ${lat}, ${lon}. Focus on history, architecture, cultural significance, and interesting stories. Be concise but engaging.`;
```

**Step 2: Generate Script**
```javascript
const scriptPrompt = `You are writing an audio guide script. Based on these facts about ${attractionName}:

${facts}

Write a natural, engaging 30-60 second audio guide script. Use conversational language suitable for text-to-speech. Start with a brief introduction of the location, share the most interesting facts, and end with an invitation to explore further.`;
```

---

## Open Questions / Risks

| Risk | Mitigation |
|------|------------|
| Overpass API rate limiting during heavy use | Implement aggressive debouncing (500ms+), cache results |
| Compass not available on all devices | Graceful fallback to static arrow |
| Audio generation latency (could exceed 20s target) | Show progress indicator, allow cancellation |
| API costs for OpenAI/ElevenLabs | User provides own API keys via env vars |
| OSM data gaps in some locations | Display "No attractions found" message |

---

## Evidence Log

See `research/evidence-log.csv` for detailed source tracking.
