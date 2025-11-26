---
work_package_id: "WP02"
subtasks:
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
title: "Map Display & Tile Loading"
phase: "Phase 0 - Setup"
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

# Work Package Prompt: WP02 – Map Display & Tile Loading

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Display an interactive Leaflet map with OpenStreetMap tiles
- Enable smooth pan and pinch-zoom gestures on iOS Chrome
- Configure GestureHandling plugin to prevent page zoom conflicts
- Export map instance and viewport change events for downstream consumers

**Success**: Map displays full-viewport, user can pan and pinch-zoom smoothly on iOS Chrome without triggering page zoom.

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - FR-001 (interactive map), SC-004 (immediate interactions)
- **Research Reference**: [research.md](../../research.md) - Section 1: Leaflet iOS Chrome Compatibility
- **Dependencies**: WP01 (project setup) must be complete

**Constraints**:
- Chrome on iOS uses WebKit (Safari bugs apply)
- Keep marker count reasonable (<100) for performance
- Use `L_DISABLE_3D=true` if rendering issues occur

## Subtasks & Detailed Guidance

### Subtask T009 – Create `src/components/Map.js` - Leaflet map initialization wrapper

- **Purpose**: Encapsulate Leaflet map creation and configuration in a reusable module.
- **Steps**:
  1. Create `src/components/Map.js`:
     ```javascript
     import L from 'leaflet';
     import 'leaflet-gesture-handling';
     import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css';

     let map = null;

     export function initMap(containerId, options = {}) {
       if (map) {
         console.warn('Map already initialized');
         return map;
       }

       const defaultCenter = options.center || [48.8566, 2.3522]; // Paris
       const defaultZoom = options.zoom || 15;

       map = L.map(containerId, {
         center: defaultCenter,
         zoom: defaultZoom,
         gestureHandling: true,
         tap: true,
         touchZoom: true,
         dragging: true
       });

       return map;
     }

     export function getMap() {
       return map;
     }
     ```
- **Files**: `src/components/Map.js`
- **Parallel?**: No - foundational component
- **Notes**: Single map instance pattern prevents re-initialization issues

### Subtask T010 – Configure Leaflet with GestureHandling plugin for iOS

- **Purpose**: Enable gesture handling to prevent iOS page zoom conflicts.
- **Steps**:
  1. Ensure `gestureHandling: true` is set in map options (done in T009)
  2. Import gesture handling CSS (done in T009)
  3. The plugin shows "Use two fingers to move the map" message on mobile
- **Files**: `src/components/Map.js` (updates from T009)
- **Parallel?**: No - part of T009
- **Notes**:
  - Plugin automatically detects touch devices
  - Message can be customized via `gestureHandlingOptions` if needed

### Subtask T011 – Add OpenStreetMap tile layer with attribution

- **Purpose**: Load map tiles from OpenStreetMap.
- **Steps**:
  1. Add to `src/components/Map.js`:
     ```javascript
     export function addTileLayer(map) {
       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
         maxZoom: 19
       }).addTo(map);
     }
     ```
  2. Call `addTileLayer(map)` after map initialization
- **Files**: `src/components/Map.js`
- **Parallel?**: No - depends on T009
- **Notes**: OSM requires attribution - do not remove

### Subtask T012 – Set default center (fallback location) and zoom level

- **Purpose**: Provide a sensible default view before user location is acquired.
- **Steps**:
  1. Default center is already set in T009 (Paris: 48.8566, 2.3522)
  2. Default zoom level 15 shows neighborhood-level detail
  3. Export function to update center:
     ```javascript
     export function setCenter(lat, lng, zoom) {
       if (map) {
         map.setView([lat, lng], zoom || map.getZoom());
       }
     }
     ```
- **Files**: `src/components/Map.js`
- **Parallel?**: No - part of map module
- **Notes**: Will be updated to user location in WP03

### Subtask T013 – Export map instance and viewport change events

- **Purpose**: Allow other modules to react to map movements.
- **Steps**:
  1. Add event subscription to `src/components/Map.js`:
     ```javascript
     export function onViewportChange(callback) {
       if (!map) return;

       map.on('moveend', () => {
         callback(getViewport());
       });

       map.on('zoomend', () => {
         callback(getViewport());
       });
     }

     export function getViewport() {
       if (!map) return null;

       const bounds = map.getBounds();
       return {
         center: {
           lat: map.getCenter().lat,
           lng: map.getCenter().lng
         },
         zoom: map.getZoom(),
         bounds: {
           south: bounds.getSouth(),
           west: bounds.getWest(),
           north: bounds.getNorth(),
           east: bounds.getEast()
         }
       };
     }
     ```
- **Files**: `src/components/Map.js`
- **Parallel?**: No - depends on map instance
- **Notes**: `moveend` fires after pan completes, `zoomend` after zoom completes

### Subtask T014 – Create `src/utils/debounce.js` utility for map events

- **Purpose**: Prevent excessive API calls during rapid map movements.
- **Steps**:
  1. Create `src/utils/debounce.js`:
     ```javascript
     export function debounce(func, wait) {
       let timeout;

       return function executedFunction(...args) {
         const later = () => {
           clearTimeout(timeout);
           func(...args);
         };

         clearTimeout(timeout);
         timeout = setTimeout(later, wait);
       };
     }
     ```
- **Files**: `src/utils/debounce.js`
- **Parallel?**: Yes - independent utility
- **Notes**: Will be used with 500ms delay for attraction fetching

## Integration: Update main.js

After all subtasks, update `src/main.js`:
```javascript
import './style.css';
import { initMap, addTileLayer, onViewportChange, getViewport } from './components/Map.js';
import { debounce } from './utils/debounce.js';

// Initialize map
const map = initMap('map');
addTileLayer(map);

// Log viewport changes (placeholder for attraction loading)
const handleViewportChange = debounce((viewport) => {
  console.log('Viewport changed:', viewport);
}, 500);

onViewportChange(handleViewportChange);

console.log('Audio Tour Guide initialized');
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| iOS WebKit rendering issues | Test on actual iOS device |
| Tile loading freezes interactions | Use `L_DISABLE_3D=true` if needed |
| Gesture handling message intrusive | Customize or disable message if UX issue |

## Definition of Done Checklist

- [ ] Map displays full-viewport on page load
- [ ] OpenStreetMap tiles load correctly
- [ ] Pan gesture works smoothly on iOS Chrome
- [ ] Pinch-zoom works without triggering page zoom
- [ ] Console logs viewport on map movement
- [ ] Attribution visible in corner
- [ ] No JavaScript errors in console

## Review Guidance

- Test on actual iOS device if possible
- Verify two-finger gesture message appears on mobile
- Check that rapid panning doesn't cause console spam (debounce working)
- Confirm map fills entire viewport with no scrollbars

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-11-25T18:45:00Z – claude – shell_pid=96814 – lane=doing – Started implementation
- 2025-11-25T18:48:00Z – claude – shell_pid=96814 – lane=for_review – Completed: Map.js with initMap, addTileLayer, getViewport, onViewportChange; debounce.js utility; main.js integration
