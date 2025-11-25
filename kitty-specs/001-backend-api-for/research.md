# Research: Backend API for Audio Generation

**Date**: 2025-11-25
**Feature**: Backend API for Audio Generation
**Branch**: `001-backend-api-for`

## Research Summary

This document captures technical decisions and findings for implementing the Go backend API on GCP Cloud Run.

## Decision 1: Go HTTP Framework

**Decision**: Use Go standard library `net/http`

**Rationale**:
- No external dependencies needed for a simple single-endpoint API
- Built-in HTTP/2 support
- Excellent performance out of the box
- Simpler deployment (no dependency management issues)

**Alternatives Considered**:
- Gin: More features, but overkill for single endpoint
- Chi: Lightweight router, but stdlib is sufficient
- Fiber: Fast but adds external dependency

## Decision 2: OpenAI API Integration

**Decision**: Direct HTTP calls to OpenAI API (no SDK)

**Rationale**:
- Simpler implementation matching existing frontend code
- Full control over request/response handling
- No SDK version compatibility concerns
- Existing prompts can be ported directly

**Configuration** (from existing frontend):
- Model: `gpt-4o-mini`
- Facts generation: 500 max tokens, temperature 0.7
- Script generation: 300 max tokens, temperature 0.8
- System prompts preserved exactly as-is

## Decision 3: ElevenLabs API Integration

**Decision**: Direct HTTP calls to ElevenLabs API

**Rationale**:
- Simple REST API, no SDK needed
- Direct port of existing frontend implementation

**Configuration** (from existing frontend):
- Voice ID: `21m00Tcm4TlvDq8ikWAM` (Rachel)
- Model: `eleven_monolingual_v1`
- Voice settings: stability 0.5, similarity_boost 0.75, style 0.0, use_speaker_boost true

## Decision 4: GCP Cloud Run Configuration

**Decision**: Single Cloud Run service with default settings

**Rationale**:
- Free tier: 2 million requests/month, 360k GB-seconds
- Automatic HTTPS
- Scales to zero when idle (cost-effective)
- Supports long-running requests (up to 60 minutes, default 5 minutes)

**Configuration**:
- Memory: 256MB (sufficient for HTTP + JSON processing)
- CPU: 1 vCPU
- Timeout: 120 seconds (to accommodate AI generation time)
- Min instances: 0 (scale to zero for free tier)
- Max instances: 1 (limit costs)
- Concurrency: 80 (default)

## Decision 5: CORS Configuration

**Decision**: Allow all origins with specific headers

**Rationale**:
- Frontend may be served from various origins (localhost, deployed URL)
- API is already public (no authentication), so CORS is not a security boundary
- Simple wildcard configuration avoids deployment issues

**Headers**:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: POST, OPTIONS
- Access-Control-Allow-Headers: Content-Type

## Decision 6: Error Handling Strategy

**Decision**: Map API errors to user-friendly messages

**Rationale**:
- Don't expose internal details (API keys, raw error messages)
- Provide actionable feedback to users
- Maintain existing error categories from frontend

**Error Mapping**:
| API Error | User-Facing Message |
|-----------|---------------------|
| OpenAI 401 | "Service configuration error. Please try again later." |
| OpenAI 429 | "Service is busy. Please wait a moment and try again." |
| ElevenLabs 401 | "Service configuration error. Please try again later." |
| ElevenLabs 429 | "Audio service is busy. Please wait a moment." |
| Network timeout | "Request timed out. Please try again." |
| Unknown | "An unexpected error occurred. Please try again." |

## Decision 7: Request/Response Format

**Decision**: JSON request, binary audio response

**Request**:
```json
{
  "name": "Eiffel Tower",
  "category": "landmark",
  "latitude": 48.8584,
  "longitude": 2.2945
}
```

**Response (success)**: Binary MP3 audio with `Content-Type: audio/mpeg`

**Response (error)**:
```json
{
  "error": "User-friendly error message"
}
```

## Prompts Reference

### Facts Generation System Prompt
```
You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists.
```

### Facts Generation User Prompt Template
```
Provide 3-5 interesting facts about "{name}" ({category}) located at coordinates {latitude}, {longitude}. Focus on:
- Historical significance
- Architectural features
- Cultural importance
- Interesting stories or legends

Be concise but engaging. Each fact should be 1-2 sentences.
```

### Script Generation System Prompt
```
You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references like "as you can see". Use clear pronunciation-friendly language.
```

### Script Generation User Prompt Template
```
Write a 30-60 second audio guide script for "{name}" based on these facts:

{facts}

Requirements:
- Start with a warm welcome mentioning the attraction name
- Share 2-3 of the most interesting facts naturally
- Use conversational, engaging language
- End with an invitation to explore or take photos
- Keep it between 80-150 words for optimal audio length
```

## Deployment Notes

### GCP Project Setup
1. Create GCP project or use existing
2. Enable Cloud Run API
3. Set up environment variables (OPENAI_API_KEY, ELEVENLABS_API_KEY)

### Deployment Command
```bash
gcloud run deploy audio-guide-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY,ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY \
  --memory 256Mi \
  --timeout 120 \
  --max-instances 1
```

### Frontend Update
Replace `VITE_BACKEND_URL` with Cloud Run URL after deployment.
