# Implementation Plan: Interactive Audio Tour Guide
*Path: kitty-specs/001-interactive-audio-tour/plan.md*

**Branch**: `001-interactive-audio-tour` | **Date**: 2025-11-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/001-interactive-audio-tour/spec.md`

## Summary

Build a frontend-only web application that displays an interactive map with user location tracking and nearby tourist attractions. Users can click on attraction markers to generate AI-powered audio guides that provide narrated facts about each location. The app uses Leaflet for mapping, Vite for build tooling, and integrates with Overpass API (attractions), OpenAI (content generation), and ElevenLabs (text-to-speech).

## Technical Context

**Language/Version**: JavaScript (ES2022+), HTML5, CSS3
**Primary Dependencies**: Vite 5.x, Leaflet 1.9.x
**Storage**: localStorage (API keys only, no persistence required)
**Testing**: Playwright with Playwright MCP
**Target Platform**: Chrome on iOS (mobile web)
**Project Type**: Single Page Application (frontend only)
**Performance Goals**: Map interactions immediate, audio generation <20s, location updates <5s
**Constraints**: No backend server, API keys via environment variables at build time
**Scale/Scope**: Single user, ~10 attractions per session, audio clips 30s-3min

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| No backend requirement | PASS | Pure frontend SPA |
| Chrome iOS compatibility | PASS | All chosen technologies support iOS Chrome |
| Testable with Playwright | PASS | Standard web app, Playwright MCP integration |

No constitution violations detected. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```
kitty-specs/001-interactive-audio-tour/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (created by /spec-kitty.tasks)
```

### Source Code (repository root)

```
src/
├── index.html           # Main HTML entry point
├── main.js              # Application entry point
├── style.css            # Global styles
├── components/
│   ├── Map.js           # Leaflet map wrapper
│   ├── UserMarker.js    # Directional arrow marker
│   ├── AttractionMarker.js  # Speaker icon markers
│   ├── AudioPlayer.js   # Playback controls
│   └── LoadingIndicator.js  # Loading states
├── services/
│   ├── geolocation.js   # Browser Geolocation API wrapper
│   ├── orientation.js   # Device compass heading
│   ├── overpass.js      # Overpass API for attractions
│   ├── openai.js        # OpenAI fact/script generation
│   ├── elevenlabs.js    # ElevenLabs TTS
│   └── audio.js         # Web Audio playback
└── utils/
    ├── config.js        # Environment variable access
    └── debounce.js      # Map movement debouncing

tests/
├── e2e/
│   ├── map.spec.js      # Map display and interaction
│   ├── location.spec.js # User location tracking
│   ├── attractions.spec.js  # Attraction loading
│   └── audio.spec.js    # Audio generation and playback
└── fixtures/
    └── mock-attractions.json  # Test data
```

**Structure Decision**: Single frontend project with Vite, organized by component/service/util pattern. No separate backend directory needed.

## Complexity Tracking

No constitution violations requiring justification.

---

## Phase 0: Research - COMPLETED

Research topics resolved (see [research.md](research.md)):

| Topic | Decision | Key Finding |
|-------|----------|-------------|
| Leaflet iOS Chrome | Use with GestureHandling plugin | Chrome iOS uses WebKit; needs viewport meta tag |
| Device Orientation | Use `webkitCompassHeading` | iOS 13+ requires permission from user gesture |
| Overpass API | POST to `/api/interpreter` | Bounding box format: `(south,west,north,east)` |
| ElevenLabs | Non-streaming MP3 | Better iOS compatibility than streaming |
| iOS Audio Autoplay | Blob URLs with `audio/mpeg` | Base64 fails on iOS; unlock on first click |

## Phase 1: Design - COMPLETED

Design artifacts generated:

| Artifact | Path | Description |
|----------|------|-------------|
| Data Model | [data-model.md](data-model.md) | Entities: UserLocation, MapViewport, Attraction, AudioGuide, AppState |
| Overpass Contract | [contracts/overpass-api.md](contracts/overpass-api.md) | Query tourist attractions from OSM |
| OpenAI Contract | [contracts/openai-api.md](contracts/openai-api.md) | Generate facts and audio scripts |
| ElevenLabs Contract | [contracts/elevenlabs-api.md](contracts/elevenlabs-api.md) | Text-to-speech conversion |
| Quickstart | [quickstart.md](quickstart.md) | Development setup guide |

## Constitution Check - Post-Design

| Principle | Status | Notes |
|-----------|--------|-------|
| No backend requirement | PASS | All APIs called directly from frontend |
| Chrome iOS compatibility | PASS | Research confirmed all tech works on iOS Chrome |
| Testable with Playwright | PASS | Standard DOM, can mock APIs |
| API key security | ACKNOWLEDGED | Keys in env vars at build time (spec assumption #9) |

---

## Next Steps

Run `/spec-kitty.tasks` to generate implementation tasks based on this plan.
