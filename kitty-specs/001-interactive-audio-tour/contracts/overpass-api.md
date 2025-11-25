# API Contract: Overpass API (Tourist Attractions)
*Path: kitty-specs/001-interactive-audio-tour/contracts/overpass-api.md*

## Overview

Query OpenStreetMap data for tourist attractions within a geographic bounding box.

## Endpoint

```
POST https://overpass-api.de/api/interpreter
```

## Request

### Headers
```
Content-Type: application/x-www-form-urlencoded
```

### Body
URL-encoded Overpass QL query.

### Query Template
```overpass
[out:json][timeout:25];
(
  nwr["tourism"~"museum|attraction|gallery|viewpoint|artwork|information"]({{south}},{{west}},{{north}},{{east}});
  nwr["historic"]({{south}},{{west}},{{north}},{{east}});
  nwr["amenity"="place_of_worship"]({{south}},{{west}},{{north}},{{east}});
);
out center;
```

### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `south` | number | Southern boundary latitude |
| `west` | number | Western boundary longitude |
| `north` | number | Northern boundary latitude |
| `east` | number | Eastern boundary longitude |

### JavaScript Implementation
```javascript
async function fetchAttractions(bounds) {
  const { south, west, north, east } = bounds;

  const query = `
    [out:json][timeout:25];
    (
      nwr["tourism"~"museum|attraction|gallery|viewpoint|artwork|information"](${south},${west},${north},${east});
      nwr["historic"](${south},${west},${north},${east});
      nwr["amenity"="place_of_worship"](${south},${west},${north},${east});
    );
    out center;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limited. Please try again.');
    }
    throw new Error(`Overpass API error: ${response.status}`);
  }

  return response.json();
}
```

## Response

### Success (200 OK)
```json
{
  "version": 0.6,
  "generator": "Overpass API",
  "osm3s": {
    "timestamp_osm_base": "2025-01-15T12:00:00Z",
    "copyright": "OpenStreetMap contributors"
  },
  "elements": [
    {
      "type": "node",
      "id": 123456789,
      "lat": 48.8584,
      "lon": 2.2945,
      "tags": {
        "name": "Eiffel Tower",
        "tourism": "attraction",
        "historic": "monument",
        "height": "330",
        "wikidata": "Q243"
      }
    },
    {
      "type": "way",
      "id": 987654321,
      "center": {
        "lat": 48.8606,
        "lon": 2.3376
      },
      "tags": {
        "name": "Louvre Museum",
        "tourism": "museum",
        "building": "yes"
      }
    }
  ]
}
```

### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `elements` | array | List of OSM elements |
| `elements[].type` | string | "node", "way", or "relation" |
| `elements[].id` | number | Unique OSM identifier |
| `elements[].lat` | number | Latitude (nodes only) |
| `elements[].lon` | number | Longitude (nodes only) |
| `elements[].center` | object | Center point (ways/relations with `out center`) |
| `elements[].tags` | object | Key-value OSM tags |
| `elements[].tags.name` | string | Display name (may be missing) |
| `elements[].tags.tourism` | string | Tourism category |
| `elements[].tags.historic` | string | Historic category |

## Error Responses

### 429 Too Many Requests
Rate limited. Implement exponential backoff.

### 400 Bad Request
Invalid Overpass QL syntax.

### 504 Gateway Timeout
Query took too long. Reduce bounding box size or simplify query.

## Transformation

Convert Overpass response to `Attraction[]`:

```javascript
function transformAttractions(response) {
  return response.elements
    .filter(el => el.tags?.name) // Must have name
    .map(el => ({
      id: el.id,
      type: el.type,
      name: el.tags.name,
      latitude: el.lat ?? el.center?.lat,
      longitude: el.lon ?? el.center?.lon,
      category: getCategory(el.tags),
      tags: el.tags
    }))
    .filter(a => a.latitude && a.longitude); // Must have coordinates
}

function getCategory(tags) {
  if (tags.tourism) return tags.tourism;
  if (tags.historic) return `historic:${tags.historic}`;
  if (tags.amenity === 'place_of_worship') return 'place_of_worship';
  return 'attraction';
}
```

## Rate Limiting Strategy

```javascript
const DEBOUNCE_MS = 500;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

let lastFetch = 0;
let pendingFetch = null;

async function debouncedFetchAttractions(bounds) {
  const now = Date.now();

  if (pendingFetch) {
    clearTimeout(pendingFetch);
  }

  return new Promise((resolve, reject) => {
    pendingFetch = setTimeout(async () => {
      try {
        const result = await fetchWithRetry(bounds);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, DEBOUNCE_MS);
  });
}

async function fetchWithRetry(bounds, attempt = 0) {
  try {
    return await fetchAttractions(bounds);
  } catch (error) {
    if (error.message.includes('429') && attempt < MAX_RETRIES) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(bounds, attempt + 1);
    }
    throw error;
  }
}
```
