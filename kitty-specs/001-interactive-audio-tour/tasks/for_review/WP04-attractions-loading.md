---
work_package_id: "WP04"
subtasks:
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
  - "T029"
  - "T030"
  - "T031"
  - "T032"
title: "Tourist Attractions Loading"
phase: "Phase 1 - User Story 1"
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "96814"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T18:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP04 – Tourist Attractions Loading 🎯 MVP

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Query Overpass API for tourist attractions within current map viewport
- Display attractions as speaker icon markers on the map
- Handle debouncing, rate limiting, and error states
- Filter to only named attractions with valid coordinates

**Success**: Attractions appear as speaker icons within 3 seconds of map movement (SC-002). Completing this work package delivers User Story 1 (MVP milestone).

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - User Story 1, FR-005/006/007, SC-002
- **Research Reference**: [research.md](../../research.md) - Section 3: Overpass API
- **Contract Reference**: [contracts/overpass-api.md](../../contracts/overpass-api.md)
- **Data Model**: [data-model.md](../../data-model.md) - Attraction entity
- **Dependencies**: WP02 (map viewport bounds)

**Critical Constraints**:
- Bounding box format is `(south, west, north, east)` - NOT lat/lng pairs
- Filter out attractions without `tags.name`
- Limit markers to ~50-100 for iOS performance
- Debounce requests by 500ms minimum

## Subtasks & Detailed Guidance

### Subtask T023 – Create `src/services/overpass.js` - Overpass API client

- **Purpose**: Encapsulate Overpass API communication.
- **Steps**:
  1. Create `src/services/overpass.js`:
     ```javascript
     const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

     export async function fetchAttractions(bounds, signal) {
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

       const response = await fetch(OVERPASS_ENDPOINT, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded'
         },
         body: `data=${encodeURIComponent(query)}`,
         signal
       });

       if (!response.ok) {
         if (response.status === 429) {
           throw new Error('RATE_LIMITED');
         }
         if (response.status === 504) {
           throw new Error('TIMEOUT');
         }
         throw new Error(`Overpass API error: ${response.status}`);
       }

       return response.json();
     }
     ```
- **Files**: `src/services/overpass.js`
- **Parallel?**: No - foundational service
- **Notes**: `signal` parameter allows request cancellation

### Subtask T024 – Implement bounding box query for tourism/historic/amenity tags

- **Purpose**: Query OSM for relevant attraction types.
- **Steps**:
  1. Query is already in T023, covering:
     - `tourism`: museum, attraction, gallery, viewpoint, artwork, information
     - `historic`: all historic tags
     - `amenity`: place_of_worship
  2. Uses `nwr` (node/way/relation) to get all element types
  3. `out center` provides coordinates for ways/relations
- **Files**: Part of `src/services/overpass.js`
- **Parallel?**: No - part of T023
- **Notes**: Tags are case-sensitive in Overpass QL

### Subtask T025 – Add response transformation to Attraction[] per data-model.md

- **Purpose**: Convert raw Overpass response to typed Attraction objects.
- **Steps**:
  1. Add to `src/services/overpass.js`:
     ```javascript
     function getCategory(tags) {
       if (tags.tourism) return tags.tourism;
       if (tags.historic) return `historic:${tags.historic}`;
       if (tags.amenity === 'place_of_worship') return 'place_of_worship';
       return 'attraction';
     }

     export function transformAttractions(response) {
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
     ```
- **Files**: `src/services/overpass.js`
- **Parallel?**: No - depends on T023/T024
- **Notes**: Matches Attraction interface in data-model.md

### Subtask T026 – Implement debounced fetch on map moveend/zoomend (500ms)

- **Purpose**: Prevent API spam during rapid map movements.
- **Steps**:
  1. Create attractions manager in `src/services/attractionsManager.js`:
     ```javascript
     import { fetchAttractions, transformAttractions } from './overpass.js';
     import { debounce } from '../utils/debounce.js';

     let currentAttractions = [];
     let abortController = null;

     export function getAttractions() {
       return currentAttractions;
     }

     async function loadAttractions(bounds, onLoading, onLoaded, onError) {
       // Cancel previous request
       if (abortController) {
         abortController.abort();
       }
       abortController = new AbortController();

       onLoading?.();

       try {
         const response = await fetchAttractions(bounds, abortController.signal);
         currentAttractions = transformAttractions(response);
         onLoaded?.(currentAttractions);
       } catch (error) {
         if (error.name === 'AbortError') {
           // Request was cancelled, ignore
           return;
         }
         onError?.(error);
       }
     }

     export const debouncedLoadAttractions = debounce(loadAttractions, 500);
     ```
- **Files**: `src/services/attractionsManager.js`
- **Parallel?**: No - integration layer
- **Notes**: AbortController cancels in-flight requests on new viewport

### Subtask T027 – Add retry logic with exponential backoff for rate limiting

- **Purpose**: Handle 429 rate limit responses gracefully.
- **Steps**:
  1. Add retry wrapper to `src/services/overpass.js`:
     ```javascript
     const MAX_RETRIES = 3;
     const BACKOFF_BASE_MS = 1000;

     export async function fetchAttractionsWithRetry(bounds, signal, attempt = 0) {
       try {
         return await fetchAttractions(bounds, signal);
       } catch (error) {
         if (error.message === 'RATE_LIMITED' && attempt < MAX_RETRIES) {
           const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
           await new Promise(r => setTimeout(r, delay));
           return fetchAttractionsWithRetry(bounds, signal, attempt + 1);
         }
         throw error;
       }
     }
     ```
  2. Update attractionsManager to use `fetchAttractionsWithRetry`
- **Files**: `src/services/overpass.js`, `src/services/attractionsManager.js`
- **Parallel?**: No - enhancement to T023
- **Notes**: Exponential backoff: 1s, 2s, 4s

### Subtask T028 – Create `src/components/AttractionMarker.js` - Speaker icon marker

- **Purpose**: Display attractions with clickable speaker icons.
- **Steps**:
  1. Create `src/components/AttractionMarker.js`:
     ```javascript
     import L from 'leaflet';

     const markers = new Map();

     function createSpeakerIcon(selected = false) {
       return L.divIcon({
         className: `attraction-marker ${selected ? 'selected' : ''}`,
         html: `
           <div class="speaker-icon">
             <svg viewBox="0 0 24 24" width="28" height="28">
               <path d="M3 9v6h4l5 5V4L7 9H3z" fill="${selected ? '#1a73e8' : '#666'}" />
               <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
                     fill="${selected ? '#1a73e8' : '#666'}" />
               <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                     fill="${selected ? '#1a73e8' : '#666'}" />
             </svg>
           </div>
         `,
         iconSize: [28, 28],
         iconAnchor: [14, 14]
       });
     }

     export function addAttractionMarker(map, attraction, onClick) {
       const marker = L.marker([attraction.latitude, attraction.longitude], {
         icon: createSpeakerIcon(false)
       })
         .addTo(map)
         .on('click', () => onClick?.(attraction));

       markers.set(attraction.id, marker);
       return marker;
     }

     export function removeAttractionMarker(attractionId) {
       const marker = markers.get(attractionId);
       if (marker) {
         marker.remove();
         markers.delete(attractionId);
       }
     }

     export function clearAllMarkers() {
       markers.forEach(marker => marker.remove());
       markers.clear();
     }

     export function setMarkerSelected(attractionId, selected) {
       const marker = markers.get(attractionId);
       if (marker) {
         marker.setIcon(createSpeakerIcon(selected));
       }
     }

     export function getMarkerCount() {
       return markers.size;
     }
     ```
- **Files**: `src/components/AttractionMarker.js`
- **Parallel?**: Yes - can develop alongside API work
- **Notes**: Store markers in Map for efficient lookup/removal

### Subtask T029 – Design speaker icon SVG with click/tap affordance

- **Purpose**: Create visually clear speaker icon with touch-friendly size.
- **Steps**:
  1. Add CSS to `src/style.css`:
     ```css
     /* Attraction markers */
     .attraction-marker {
       background: transparent;
       border: none;
       cursor: pointer;
     }

     .speaker-icon {
       background: white;
       border-radius: 50%;
       padding: 4px;
       box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
       transition: transform 0.15s ease-out;
     }

     .attraction-marker:hover .speaker-icon,
     .attraction-marker.selected .speaker-icon {
       transform: scale(1.15);
     }

     .attraction-marker.selected .speaker-icon {
       background: #e3f2fd;
     }
     ```
- **Files**: `src/style.css`
- **Parallel?**: Yes - independent CSS work
- **Notes**: 28x28px icon size provides good touch target

### Subtask T030 – Add loading indicator during attraction fetch

- **Purpose**: Show user that attractions are loading.
- **Steps**:
  1. Create simple loading indicator:
     ```javascript
     // In main.js or separate component
     function showAttractionsLoading() {
       let indicator = document.getElementById('attractions-loading');
       if (!indicator) {
         indicator = document.createElement('div');
         indicator.id = 'attractions-loading';
         indicator.className = 'loading-indicator';
         indicator.innerHTML = '<span>Loading attractions...</span>';
         document.body.appendChild(indicator);
       }
       indicator.style.display = 'block';
     }

     function hideAttractionsLoading() {
       const indicator = document.getElementById('attractions-loading');
       if (indicator) {
         indicator.style.display = 'none';
       }
     }
     ```
  2. Add CSS:
     ```css
     .loading-indicator {
       position: fixed;
       top: 10px;
       left: 50%;
       transform: translateX(-50%);
       background: white;
       padding: 8px 16px;
       border-radius: 20px;
       box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
       z-index: 1000;
       font-size: 14px;
     }
     ```
- **Files**: `src/main.js`, `src/style.css`
- **Parallel?**: Yes - independent UI component
- **Notes**: Simple pill-shaped indicator at top of screen

### Subtask T031 – Handle "no attractions found" state with user message

- **Purpose**: Inform user when area has no attractions.
- **Steps**:
  1. Add message display:
     ```javascript
     function showNoAttractionsMessage() {
       let message = document.getElementById('no-attractions');
       if (!message) {
         message = document.createElement('div');
         message.id = 'no-attractions';
         message.className = 'no-attractions-message';
         message.textContent = 'No attractions found in this area. Try zooming out or moving the map.';
         document.body.appendChild(message);
       }
       message.style.display = 'block';

       // Auto-hide after 5 seconds
       setTimeout(() => {
         message.style.display = 'none';
       }, 5000);
     }
     ```
  2. Add CSS:
     ```css
     .no-attractions-message {
       position: fixed;
       bottom: 20px;
       left: 50%;
       transform: translateX(-50%);
       background: #fef3cd;
       color: #856404;
       padding: 12px 20px;
       border-radius: 8px;
       box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
       z-index: 1000;
     }
     ```
- **Files**: `src/main.js`, `src/style.css`
- **Parallel?**: Yes - independent UI message
- **Notes**: Use warning color to distinguish from loading

### Subtask T032 – Filter out attractions without names

- **Purpose**: Only show attractions that have meaningful display names.
- **Steps**:
  1. Already implemented in T025 (`filter(el => el.tags?.name)`)
  2. Verify filter works by checking console output
- **Files**: Part of `src/services/overpass.js`
- **Parallel?**: No - already handled
- **Notes**: Unnamed attractions aren't useful for audio guides

## Integration: Update main.js

Full integration after all subtasks:
```javascript
import { onViewportChange, getMap } from './components/Map.js';
import { debouncedLoadAttractions } from './services/attractionsManager.js';
import { addAttractionMarker, clearAllMarkers } from './components/AttractionMarker.js';

// ... existing map and location setup ...

function handleViewportChange(viewport) {
  debouncedLoadAttractions(
    viewport.bounds,
    () => {
      showAttractionsLoading();
    },
    (attractions) => {
      hideAttractionsLoading();
      clearAllMarkers();

      if (attractions.length === 0) {
        showNoAttractionsMessage();
        return;
      }

      // Limit markers for performance
      const limitedAttractions = attractions.slice(0, 100);

      limitedAttractions.forEach(attraction => {
        addAttractionMarker(getMap(), attraction, (clicked) => {
          console.log('Attraction clicked:', clicked.name);
          // Audio generation will be added in WP05
        });
      });
    },
    (error) => {
      hideAttractionsLoading();
      console.error('Failed to load attractions:', error);
      // Error handling will be enhanced in WP08
    }
  );
}

onViewportChange(handleViewportChange);

// Trigger initial load
const initialViewport = getViewport();
if (initialViewport) {
  handleViewportChange(initialViewport);
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Overpass rate limiting | 500ms debounce + exponential backoff |
| Too many markers (performance) | Limit to 100 markers |
| No attractions in area | User-friendly message |
| Large bounding box timeout | Keep zoom reasonable, timeout handling |

## Definition of Done Checklist

- [ ] Speaker icons appear for attractions when map stops moving
- [ ] Icons appear within 3 seconds of map movement (SC-002)
- [ ] Loading indicator shows during fetch
- [ ] "No attractions" message appears when area is empty
- [ ] Clicking a speaker icon logs attraction name to console
- [ ] Markers clear and reload on viewport change
- [ ] Rate limiting handled without crashing
- [ ] Only named attractions shown

## Review Guidance

- Test in an area known to have tourist attractions (e.g., Paris, London)
- Verify debouncing by rapidly panning - should only make one request
- Check marker count doesn't exceed 100
- Confirm clicking markers works on touch devices

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-11-25T19:10:00Z – claude – shell_pid=96814 – lane=doing – Started implementation
- 2025-11-25T19:15:00Z – claude – shell_pid=96814 – lane=for_review – Completed: overpass.js, attractionsManager.js, AttractionMarker.js, CSS styles, main.js integration
