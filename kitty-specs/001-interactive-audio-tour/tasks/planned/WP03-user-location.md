---
work_package_id: "WP03"
subtasks:
  - "T015"
  - "T016"
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
title: "User Location & Compass Heading"
phase: "Phase 1 - User Story 1"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T18:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP03 – User Location & Compass Heading

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Display user's current location on the map with a directional arrow marker
- Rotate arrow based on device compass heading
- Handle iOS-specific permission flows for geolocation and device orientation
- Gracefully degrade when permissions denied or sensors unavailable

**Success**: Arrow marker appears at user location within 5 seconds (SC-001), rotates when device orientation changes within 2 seconds (SC-009).

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - User Story 1, FR-002/003/004, SC-001/009
- **Research Reference**: [research.md](../../research.md) - Section 2: Device Orientation API
- **Data Model**: [data-model.md](../../data-model.md) - UserLocation entity
- **Dependencies**: WP02 (map display) must be complete

**Critical iOS Constraints**:
- iOS 13+ requires `DeviceOrientationEvent.requestPermission()` from user gesture
- Use `webkitCompassHeading` for true compass (not `alpha`)
- Requires HTTPS in production (localhost OK for dev)

## Subtasks & Detailed Guidance

### Subtask T015 – Create `src/services/geolocation.js` - Browser Geolocation API wrapper

- **Purpose**: Encapsulate browser geolocation API with error handling.
- **Steps**:
  1. Create `src/services/geolocation.js`:
     ```javascript
     let watchId = null;

     export function isGeolocationSupported() {
       return 'geolocation' in navigator;
     }

     export async function requestGeolocationPermission() {
       if (!isGeolocationSupported()) {
         return { status: 'unavailable' };
       }

       try {
         // Try to get current position to trigger permission prompt
         await new Promise((resolve, reject) => {
           navigator.geolocation.getCurrentPosition(resolve, reject, {
             timeout: 10000,
             enableHighAccuracy: true
           });
         });
         return { status: 'granted' };
       } catch (error) {
         if (error.code === error.PERMISSION_DENIED) {
           return { status: 'denied' };
         }
         return { status: 'error', error: error.message };
       }
     }
     ```
- **Files**: `src/services/geolocation.js`
- **Parallel?**: No - foundational service
- **Notes**: High accuracy mode uses GPS on mobile devices

### Subtask T016 – Implement `watchPosition` with error handling and permission flow

- **Purpose**: Continuously track user position with callbacks.
- **Steps**:
  1. Add to `src/services/geolocation.js`:
     ```javascript
     export function watchPosition(onUpdate, onError) {
       if (!isGeolocationSupported()) {
         onError?.({ type: 'unavailable', message: 'Geolocation not supported' });
         return null;
       }

       watchId = navigator.geolocation.watchPosition(
         (position) => {
           onUpdate({
             latitude: position.coords.latitude,
             longitude: position.coords.longitude,
             accuracy: position.coords.accuracy,
             timestamp: position.timestamp
           });
         },
         (error) => {
           let errorType = 'unknown';
           let message = error.message;

           switch (error.code) {
             case error.PERMISSION_DENIED:
               errorType = 'denied';
               message = 'Location permission denied';
               break;
             case error.POSITION_UNAVAILABLE:
               errorType = 'unavailable';
               message = 'Location unavailable';
               break;
             case error.TIMEOUT:
               errorType = 'timeout';
               message = 'Location request timed out';
               break;
           }

           onError?.({ type: errorType, message });
         },
         {
           enableHighAccuracy: true,
           timeout: 10000,
           maximumAge: 5000
         }
       );

       return watchId;
     }

     export function stopWatching() {
       if (watchId !== null) {
         navigator.geolocation.clearWatch(watchId);
         watchId = null;
       }
     }
     ```
- **Files**: `src/services/geolocation.js`
- **Parallel?**: No - depends on T015
- **Notes**: `maximumAge: 5000` allows cached positions up to 5 seconds old

### Subtask T017 – Create `src/services/orientation.js` - Device compass heading service

- **Purpose**: Get device compass heading for directional arrow.
- **Steps**:
  1. Create `src/services/orientation.js`:
     ```javascript
     let orientationCallback = null;

     export function isOrientationSupported() {
       return 'DeviceOrientationEvent' in window;
     }

     export function isPermissionRequired() {
       return typeof DeviceOrientationEvent.requestPermission === 'function';
     }
     ```
- **Files**: `src/services/orientation.js`
- **Parallel?**: Yes - can develop alongside geolocation
- **Notes**: iOS requires permission request from user gesture

### Subtask T018 – Implement iOS-specific `webkitCompassHeading` with permission request

- **Purpose**: Handle iOS compass permission flow and get true heading.
- **Steps**:
  1. Add to `src/services/orientation.js`:
     ```javascript
     export async function requestOrientationPermission() {
       if (!isOrientationSupported()) {
         return { status: 'unavailable' };
       }

       if (!isPermissionRequired()) {
         // Non-iOS: permission not needed
         return { status: 'granted' };
       }

       try {
         const permission = await DeviceOrientationEvent.requestPermission();
         return { status: permission };
       } catch (error) {
         return { status: 'error', error: error.message };
       }
     }

     export function watchOrientation(onHeadingUpdate) {
       if (!isOrientationSupported()) {
         return false;
       }

       // Throttle updates to 100ms
       let lastUpdate = 0;
       const THROTTLE_MS = 100;

       function handleOrientation(event) {
         const now = Date.now();
         if (now - lastUpdate < THROTTLE_MS) return;
         lastUpdate = now;

         // iOS: use webkitCompassHeading (true north)
         // Android: convert alpha (360 - alpha for approximate heading)
         let heading = null;

         if (event.webkitCompassHeading !== undefined) {
           heading = event.webkitCompassHeading;
         } else if (event.alpha !== null) {
           heading = 360 - event.alpha;
         }

         if (heading !== null) {
           onHeadingUpdate(heading);
         }
       }

       window.addEventListener('deviceorientation', handleOrientation, true);
       orientationCallback = handleOrientation;

       return true;
     }

     export function stopWatchingOrientation() {
       if (orientationCallback) {
         window.removeEventListener('deviceorientation', orientationCallback, true);
         orientationCallback = null;
       }
     }
     ```
- **Files**: `src/services/orientation.js`
- **Parallel?**: Yes - parallel with geolocation work
- **Notes**:
  - `webkitCompassHeading` gives 0-360 degrees from magnetic north
  - Must be called after user gesture for iOS permission

### Subtask T019 – Create `src/components/UserMarker.js` - Directional arrow marker component

- **Purpose**: Display user location with rotatable arrow indicator.
- **Steps**:
  1. Create `src/components/UserMarker.js`:
     ```javascript
     import L from 'leaflet';

     let userMarker = null;
     let currentHeading = 0;

     // Arrow icon pointing up (north = 0 degrees)
     function createArrowIcon(heading = 0) {
       return L.divIcon({
         className: 'user-marker',
         html: `
           <div class="user-marker-arrow" style="transform: rotate(${heading}deg)">
             <svg viewBox="0 0 24 24" width="32" height="32">
               <path d="M12 2L6 14h12L12 2z" fill="#4285f4" stroke="#1a73e8" stroke-width="1"/>
               <circle cx="12" cy="16" r="4" fill="#4285f4" stroke="#1a73e8" stroke-width="1"/>
             </svg>
           </div>
         `,
         iconSize: [32, 32],
         iconAnchor: [16, 16]
       });
     }

     export function createUserMarker(map, lat, lng, heading = 0) {
       if (userMarker) {
         userMarker.remove();
       }

       currentHeading = heading;
       userMarker = L.marker([lat, lng], {
         icon: createArrowIcon(heading),
         zIndexOffset: 1000 // Always on top
       }).addTo(map);

       return userMarker;
     }

     export function updateUserPosition(lat, lng) {
       if (userMarker) {
         userMarker.setLatLng([lat, lng]);
       }
     }

     export function updateUserHeading(heading) {
       if (userMarker && heading !== currentHeading) {
         currentHeading = heading;
         userMarker.setIcon(createArrowIcon(heading));
       }
     }

     export function removeUserMarker() {
       if (userMarker) {
         userMarker.remove();
         userMarker = null;
       }
     }
     ```
- **Files**: `src/components/UserMarker.js`
- **Parallel?**: No - depends on map being available
- **Notes**: Arrow points up by default, rotates with CSS transform

### Subtask T020 – Design arrow SVG/CSS that rotates based on heading

- **Purpose**: Add CSS styles for user marker appearance.
- **Steps**:
  1. Add to `src/style.css`:
     ```css
     /* User location marker */
     .user-marker {
       background: transparent;
       border: none;
     }

     .user-marker-arrow {
       transition: transform 0.2s ease-out;
     }

     .user-marker-arrow svg {
       filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
     }
     ```
- **Files**: `src/style.css`
- **Parallel?**: No - part of marker implementation
- **Notes**: Smooth rotation transition (0.2s) for heading changes

### Subtask T021 – Center map on user location when first acquired

- **Purpose**: Automatically pan map to user's location on first fix.
- **Steps**:
  1. In main.js integration, after first position callback:
     ```javascript
     let hasInitialLocation = false;

     function handlePositionUpdate(position) {
       if (!hasInitialLocation) {
         setCenter(position.latitude, position.longitude, 16);
         hasInitialLocation = true;
       }
       // Update marker...
     }
     ```
- **Files**: `src/main.js` (integration)
- **Parallel?**: No - integration step
- **Notes**: Only center once; subsequent updates just move marker

### Subtask T022 – Handle location permission denial gracefully

- **Purpose**: Allow app to function without location.
- **Steps**:
  1. Create message display function:
     ```javascript
     export function showLocationDeniedMessage() {
       const message = document.createElement('div');
       message.className = 'location-denied-message';
       message.innerHTML = `
         <p>Location access was denied.</p>
         <p>You can still explore the map manually.</p>
         <button onclick="this.parentElement.remove()">Dismiss</button>
       `;
       document.body.appendChild(message);
     }
     ```
  2. Add CSS for message:
     ```css
     .location-denied-message {
       position: fixed;
       bottom: 20px;
       left: 50%;
       transform: translateX(-50%);
       background: white;
       padding: 16px;
       border-radius: 8px;
       box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
       z-index: 1000;
       text-align: center;
     }

     .location-denied-message button {
       margin-top: 8px;
       padding: 8px 16px;
       border: none;
       background: #4285f4;
       color: white;
       border-radius: 4px;
       cursor: pointer;
     }
     ```
- **Files**: `src/main.js`, `src/style.css`
- **Parallel?**: No - integration step
- **Notes**: App should remain fully functional for manual exploration

## Integration: Update main.js

Full integration after all subtasks:
```javascript
import './style.css';
import { initMap, addTileLayer, setCenter, onViewportChange } from './components/Map.js';
import { debounce } from './utils/debounce.js';
import { watchPosition, requestGeolocationPermission } from './services/geolocation.js';
import { watchOrientation, requestOrientationPermission, isPermissionRequired } from './services/orientation.js';
import { createUserMarker, updateUserPosition, updateUserHeading } from './components/UserMarker.js';

const map = initMap('map');
addTileLayer(map);

let hasInitialLocation = false;

// Geolocation
async function initLocation() {
  const result = await requestGeolocationPermission();

  if (result.status === 'granted') {
    watchPosition(
      (position) => {
        if (!hasInitialLocation) {
          setCenter(position.latitude, position.longitude, 16);
          createUserMarker(map, position.latitude, position.longitude);
          hasInitialLocation = true;

          // Request orientation permission after location (requires user gesture context)
          initOrientation();
        } else {
          updateUserPosition(position.latitude, position.longitude);
        }
      },
      (error) => {
        console.warn('Location error:', error);
      }
    );
  } else {
    showLocationDeniedMessage();
  }
}

// Compass orientation
async function initOrientation() {
  if (isPermissionRequired()) {
    const result = await requestOrientationPermission();
    if (result.status !== 'granted') {
      console.log('Orientation permission not granted, using static arrow');
      return;
    }
  }

  watchOrientation((heading) => {
    updateUserHeading(heading);
  });
}

// Start
initLocation();

// Viewport changes (for attractions in WP04)
onViewportChange(debounce((viewport) => {
  console.log('Viewport:', viewport);
}, 500));
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| iOS orientation permission fails | Graceful fallback to static arrow |
| Compass sensor not available | Show north-facing arrow |
| Permission denied by user | Show manual navigation message |
| HTTPS required for production | Deploy to HTTPS host |

## Definition of Done Checklist

- [ ] Location permission prompt appears on app load
- [ ] Arrow marker appears at user location (or fallback message if denied)
- [ ] Arrow rotates when device orientation changes (iOS)
- [ ] Map centers on user location on first fix
- [ ] No errors when permissions denied
- [ ] Location updates within 5 seconds (SC-001)
- [ ] Heading updates within 2 seconds (SC-009)

## Review Guidance

- Test permission denied flow on iOS
- Verify arrow rotation is smooth (CSS transition)
- Check that compass works on actual iOS device (simulators may not have compass)
- Confirm manual map navigation works when location denied

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
