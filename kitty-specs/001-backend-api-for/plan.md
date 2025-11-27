# Implementation Plan: Backend API for Audio Generation

**Branch**: `001-backend-api-for` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/kitty-specs/001-backend-api-for/spec.md`

## Summary

Create a Go backend API deployed on GCP Cloud Run that accepts attraction data (name, category, latitude, longitude) and returns generated audio. This moves OpenAI and ElevenLabs API calls from the frontend to a secure backend, protecting API keys from exposure. The frontend will be updated to call this single endpoint instead of making direct API calls.

## Technical Context

**Language/Version**: Go 1.23+
**Primary Dependencies**: net/http (stdlib), OpenAI API client, ElevenLabs API (HTTP)
**Storage**: N/A (stateless, no persistence)
**Testing**: go test (stdlib)
**Target Platform**: GCP Cloud Run (serverless container)
**Project Type**: Web application (backend API + existing frontend)
**Performance Goals**: Response within 60 seconds (includes AI generation time)
**Constraints**: Must fit within GCP Cloud Run free tier (2M requests/month, 360k GB-seconds)
**Scale/Scope**: Low volume, single user/developer use case

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution has no specific constraints defined (template placeholders only). Proceeding with standard best practices:
- [x] Keep it simple - single endpoint, minimal dependencies
- [x] No over-engineering - reuse existing prompts and settings
- [x] Stateless design - no database needed

## Project Structure

### Documentation (this feature)

```
kitty-specs/001-backend-api-for/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI spec)
└── tasks.md             # Phase 2 output (created by /spec-kitty.tasks)
```

### Source Code (repository root)

```
backend/
├── main.go              # Entry point, HTTP server
├── handlers/
│   └── audio.go         # POST /generate-audio handler
├── services/
│   ├── openai.go        # OpenAI API client (facts + script generation)
│   └── elevenlabs.go    # ElevenLabs API client (TTS)
├── Dockerfile           # Container for Cloud Run
├── go.mod               # Go module definition
└── go.sum               # Dependency checksums

src/                     # Existing frontend (modified)
├── services/
│   ├── openai.js        # REMOVED - calls moved to backend
│   ├── elevenlabs.js    # REMOVED - calls moved to backend
│   └── audioApi.js      # NEW - calls backend endpoint
└── ...
```

**Structure Decision**: Web application with separate backend/ directory for the new Go API. Frontend modifications are minimal - replace service files with a single API client.

## Complexity Tracking

No constitution violations - design follows simplest possible approach:
- Single endpoint
- No database
- Stdlib HTTP server
- Minimal external dependencies
