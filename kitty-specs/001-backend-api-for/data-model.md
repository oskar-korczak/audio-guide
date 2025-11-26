# Data Model: Backend API for Audio Generation

**Date**: 2025-11-25
**Feature**: Backend API for Audio Generation

## Overview

This is a stateless API - no persistent data storage. All entities represent request/response structures passed between frontend and backend.

## Entities

### Attraction (Input)

Represents a point of interest submitted for audio generation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Name of the attraction (e.g., "Eiffel Tower") |
| category | string | Yes | Type of attraction (e.g., "landmark", "museum") |
| latitude | number | Yes | Geographic latitude coordinate |
| longitude | number | Yes | Geographic longitude coordinate |

**Validation Rules**:
- `name`: Non-empty string, max 500 characters
- `category`: Non-empty string, max 100 characters
- `latitude`: Valid latitude (-90 to 90)
- `longitude`: Valid longitude (-180 to 180)

### AudioGenerationRequest (Internal)

Internal representation during processing pipeline.

| Field | Type | Description |
|-------|------|-------------|
| attraction | Attraction | Input attraction data |
| facts | string | Generated facts (after OpenAI step 1) |
| script | string | Generated script (after OpenAI step 2) |
| audio | []byte | Generated audio (after ElevenLabs step) |

**State Transitions**:
```
[Request Received]
       ↓
[Validating] → [Validation Error] → Response 400
       ↓
[Generating Facts] → [OpenAI Error] → Response 502
       ↓
[Generating Script] → [OpenAI Error] → Response 502
       ↓
[Generating Audio] → [ElevenLabs Error] → Response 502
       ↓
[Complete] → Response 200 (audio binary)
```

### ErrorResponse (Output)

Returned when processing fails.

| Field | Type | Description |
|-------|------|-------------|
| error | string | User-friendly error message |

### AudioResponse (Output)

Successful response is binary audio data:
- Content-Type: `audio/mpeg`
- Body: Raw MP3 bytes

## Relationships

```
┌─────────────────┐
│    Frontend     │
│  (JavaScript)   │
└────────┬────────┘
         │ POST /generate-audio
         │ JSON: Attraction
         ↓
┌─────────────────┐
│   Go Backend    │
│  (Cloud Run)    │
├─────────────────┤
│ 1. Validate     │
│ 2. Call OpenAI  │──→ OpenAI API (facts)
│ 3. Call OpenAI  │──→ OpenAI API (script)
│ 4. Call 11Labs  │──→ ElevenLabs API (audio)
└────────┬────────┘
         │ Response: audio/mpeg OR JSON error
         ↓
┌─────────────────┐
│    Frontend     │
│ (Audio Player)  │
└─────────────────┘
```

## No Persistent Storage

This API is intentionally stateless:
- No database
- No caching
- No session storage
- Audio generated fresh on each request

This simplifies deployment and stays within free tier limits.
