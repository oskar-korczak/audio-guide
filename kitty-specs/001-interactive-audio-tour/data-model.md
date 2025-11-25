# Data Model: Interactive Audio Tour Guide
*Path: kitty-specs/001-interactive-audio-tour/data-model.md*

**Feature Branch**: `001-interactive-audio-tour`
**Date**: 2025-11-25

## Overview

This document defines the data entities, their attributes, relationships, and state transitions for the Interactive Audio Tour Guide application. All data is client-side only - no persistent storage.

---

## Entities

### 1. UserLocation

Represents the user's current geographic position and device orientation.

| Attribute | Type | Description | Source |
|-----------|------|-------------|--------|
| `latitude` | `number` | Latitude in decimal degrees | Geolocation API |
| `longitude` | `number` | Longitude in decimal degrees | Geolocation API |
| `accuracy` | `number` | Position accuracy in meters | Geolocation API |
| `heading` | `number \| null` | Compass heading (0-360, null if unavailable) | DeviceOrientation API |
| `timestamp` | `number` | Unix timestamp of last update | Geolocation API |

**Validation Rules:**
- `latitude`: -90 to 90
- `longitude`: -180 to 180
- `accuracy`: > 0
- `heading`: 0 to 360 (or null)

**Update Frequency:**
- Position: On Geolocation `watchPosition` callback
- Heading: On DeviceOrientation event (throttled to 100ms)

```typescript
interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  timestamp: number;
}
```

---

### 2. MapViewport

Represents the currently visible map area.

| Attribute | Type | Description |
|-----------|------|-------------|
| `center` | `{lat, lng}` | Center coordinates of viewport |
| `zoom` | `number` | Current zoom level (0-20) |
| `bounds` | `LatLngBounds` | Geographic boundaries (SW, NE corners) |

**Derived Values:**
- `boundingBox`: `[south, west, north, east]` for Overpass API queries

**Update Events:**
- `moveend`: When user finishes panning
- `zoomend`: When user finishes zooming

```typescript
interface MapViewport {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}
```

---

### 3. Attraction

Represents a tourist attraction from OpenStreetMap.

| Attribute | Type | Description | Source |
|-----------|------|-------------|--------|
| `id` | `number` | Unique OSM ID | Overpass API |
| `type` | `string` | OSM element type (node/way/relation) | Overpass API |
| `name` | `string` | Display name | Overpass `tags.name` |
| `latitude` | `number` | Latitude coordinate | Overpass `lat` or `center.lat` |
| `longitude` | `number` | Longitude coordinate | Overpass `lon` or `center.lon` |
| `category` | `string` | Attraction category | Derived from tags |
| `tags` | `object` | Raw OSM tags | Overpass `tags` |

**Category Derivation:**
```javascript
function getCategory(tags) {
  if (tags.tourism) return tags.tourism;
  if (tags.historic) return `historic:${tags.historic}`;
  if (tags.amenity === 'place_of_worship') return 'place_of_worship';
  return 'attraction';
}
```

**Validation Rules:**
- `name` required (filter out unnamed attractions)
- `latitude` and `longitude` required

```typescript
interface Attraction {
  id: number;
  type: 'node' | 'way' | 'relation';
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  tags: Record<string, string>;
}
```

---

### 4. AudioGuide

Represents generated audio content for an attraction.

| Attribute | Type | Description |
|-----------|------|-------------|
| `attractionId` | `number` | Reference to Attraction |
| `facts` | `string` | Generated facts from OpenAI |
| `script` | `string` | Generated narration script |
| `audioBlob` | `Blob` | Audio data from ElevenLabs |
| `audioUrl` | `string` | Blob URL for playback |
| `duration` | `number` | Audio duration in seconds |
| `status` | `AudioGuideStatus` | Current generation status |
| `error` | `string \| null` | Error message if failed |

**Status Enum:**
```typescript
type AudioGuideStatus =
  | 'idle'
  | 'fetching_facts'
  | 'generating_script'
  | 'generating_audio'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'error';
```

```typescript
interface AudioGuide {
  attractionId: number;
  facts: string | null;
  script: string | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number | null;
  status: AudioGuideStatus;
  error: string | null;
}
```

---

### 5. AppState

Global application state.

| Attribute | Type | Description |
|-----------|------|-------------|
| `userLocation` | `UserLocation \| null` | Current user position |
| `locationPermission` | `PermissionStatus` | Geolocation permission state |
| `compassPermission` | `PermissionStatus` | DeviceOrientation permission state |
| `viewport` | `MapViewport` | Current map view |
| `attractions` | `Attraction[]` | Loaded attractions |
| `selectedAttractionId` | `number \| null` | Currently selected attraction |
| `currentAudioGuide` | `AudioGuide \| null` | Active audio guide |
| `isLoading` | `boolean` | Attractions loading state |
| `error` | `AppError \| null` | Current error state |

**Permission Status:**
```typescript
type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';
```

**Error Types:**
```typescript
interface AppError {
  type: 'location' | 'attractions' | 'audio_generation' | 'playback';
  message: string;
  retryable: boolean;
}
```

---

## State Transitions

### Audio Guide Generation Flow

```
[idle]
  │
  ├─ user clicks attraction
  ▼
[fetching_facts] ──error──► [error]
  │
  ├─ facts received
  ▼
[generating_script] ──error──► [error]
  │
  ├─ script received
  ▼
[generating_audio] ──error──► [error]
  │
  ├─ audio received
  ▼
[ready]
  │
  ├─ user clicks play
  ▼
[playing] ◄──────────────────┐
  │                          │
  ├─ user clicks pause       │
  ▼                          │
[paused] ─── user clicks play┘
  │
  ├─ user selects new attraction
  ▼
[idle] (reset)
```

### Location Permission Flow

```
[prompt]
  │
  ├─ user grants ──► [granted] ──► start watching position
  │
  └─ user denies ──► [denied] ──► show manual navigation message
```

### Compass Permission Flow (iOS only)

```
[prompt]
  │
  ├─ user interaction triggers request
  │
  ├─ user grants ──► [granted] ──► start watching orientation
  │
  └─ user denies ──► [denied] ──► use static arrow (north)
```

---

## Relationships

```
┌─────────────┐     1:1      ┌─────────────┐
│ AppState    │──────────────│ UserLocation│
└─────────────┘              └─────────────┘
      │
      │ 1:1
      ▼
┌─────────────┐
│ MapViewport │
└─────────────┘
      │
      │ contains (viewport bounds)
      ▼
┌─────────────┐     1:1      ┌─────────────┐
│ Attraction  │◄─────────────│ AudioGuide  │
│ (many)      │              │ (0 or 1)    │
└─────────────┘              └─────────────┘
```

---

## localStorage Schema

Only API configuration is persisted:

```typescript
interface StoredConfig {
  // No persistent storage in this version
  // API keys come from environment variables at build time
}
```

---

## Validation Summary

| Entity | Required Fields | Constraints |
|--------|-----------------|-------------|
| UserLocation | latitude, longitude | Valid coordinate ranges |
| MapViewport | center, zoom, bounds | zoom 0-20 |
| Attraction | id, name, latitude, longitude | name non-empty |
| AudioGuide | attractionId, status | valid status enum |
