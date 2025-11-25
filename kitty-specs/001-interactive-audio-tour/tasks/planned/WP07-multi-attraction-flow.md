---
work_package_id: "WP07"
subtasks:
  - "T052"
  - "T053"
  - "T054"
  - "T055"
  - "T056"
  - "T057"
  - "T058"
title: "Multi-Attraction Flow & State Management"
phase: "Phase 3 - User Story 3"
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

# Work Package Prompt: WP07 – Multi-Attraction Flow & State Management

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Create centralized application state management
- Handle seamless switching between attractions
- Cancel in-progress generation when selecting a new attraction
- Update markers when viewport changes

**Success**: User can select a new attraction while audio is generating or playing, and the app smoothly transitions to the new selection without errors.

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - User Story 3, Edge Cases (rapid switching)
- **Data Model**: [data-model.md](../../data-model.md) - AppState, AudioGuideStatus transitions
- **Dependencies**: WP05 (audio generation), WP06 (audio playback)

**Key Requirements**:
- Cancel in-flight API requests when new attraction selected
- Stop audio playback when switching
- Provide visual feedback for selected attraction
- Handle rapid clicking gracefully

## Subtasks & Detailed Guidance

### Subtask T052 – Create `src/state/AppState.js` - Global application state management

- **Purpose**: Centralize all application state for predictable behavior.
- **Steps**:
  1. Create `src/state/AppState.js`:
     ```javascript
     // Application state following data-model.md

     const state = {
       userLocation: null,
       locationPermission: 'prompt', // prompt | granted | denied | unavailable
       compassPermission: 'prompt',
       viewport: null,
       attractions: [],
       selectedAttractionId: null,
       currentAudioGuide: null,
       audioStatus: 'idle', // idle | fetching_facts | generating_script | generating_audio | ready | playing | paused | error
       isLoadingAttractions: false,
       error: null
     };

     const listeners = new Set();

     export function getState() {
       return { ...state };
     }

     export function setState(updates) {
       Object.assign(state, updates);
       notifyListeners();
     }

     export function subscribe(listener) {
       listeners.add(listener);
       return () => listeners.delete(listener);
     }

     function notifyListeners() {
       listeners.forEach(listener => listener(getState()));
     }

     // Convenience getters
     export function getSelectedAttraction() {
       if (!state.selectedAttractionId) return null;
       return state.attractions.find(a => a.id === state.selectedAttractionId);
     }

     export function isGenerating() {
       return ['fetching_facts', 'generating_script', 'generating_audio'].includes(state.audioStatus);
     }

     export function isAudioReady() {
       return ['ready', 'playing', 'paused'].includes(state.audioStatus);
     }
     ```
- **Files**: `src/state/AppState.js`
- **Parallel?**: No - foundational state module
- **Notes**: Simple pub/sub pattern, no external dependencies

### Subtask T053 – Implement state transitions per data-model.md AudioGuideStatus

- **Purpose**: Ensure valid state transitions.
- **Steps**:
  1. Add to `src/state/AppState.js`:
     ```javascript
     const VALID_TRANSITIONS = {
       idle: ['fetching_facts'],
       fetching_facts: ['generating_script', 'error', 'idle'],
       generating_script: ['generating_audio', 'error', 'idle'],
       generating_audio: ['ready', 'error', 'idle'],
       ready: ['playing', 'idle'],
       playing: ['paused', 'ready', 'idle'],
       paused: ['playing', 'ready', 'idle'],
       error: ['idle', 'fetching_facts']
     };

     export function setAudioStatus(newStatus) {
       const currentStatus = state.audioStatus;

       if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
         console.warn(`Invalid status transition: ${currentStatus} -> ${newStatus}`);
         // Allow anyway for flexibility, but log warning
       }

       setState({ audioStatus: newStatus });
     }

     export function resetAudioState() {
       setState({
         currentAudioGuide: null,
         audioStatus: 'idle',
         error: null
       });
     }
     ```
- **Files**: `src/state/AppState.js`
- **Parallel?**: No - depends on T052
- **Notes**: Warn on invalid transitions but allow for edge cases

### Subtask T054 – Handle attraction selection during active generation (cancel and restart)

- **Purpose**: Cancel in-progress generation when user selects new attraction.
- **Steps**:
  1. Create `src/state/actions.js`:
     ```javascript
     import { setState, getState, setAudioStatus, resetAudioState, isGenerating } from './AppState.js';
     import { generateAudioGuide, cleanupAudioGuide } from '../services/audioGuideGenerator.js';
     import { cleanup as cleanupAudio } from '../services/audio.js';
     import { setMarkerSelected } from '../components/AttractionMarker.js';

     let abortController = null;

     export async function selectAttraction(attraction) {
       const currentState = getState();

       // Deselect previous
       if (currentState.selectedAttractionId) {
         setMarkerSelected(currentState.selectedAttractionId, false);
       }

       // Cancel any in-progress generation
       if (abortController) {
         abortController.abort();
         abortController = null;
       }

       // Cleanup previous audio
       cleanupAudio();
       if (currentState.currentAudioGuide) {
         cleanupAudioGuide(currentState.currentAudioGuide);
       }

       // Reset audio state
       resetAudioState();

       // Set new selection
       setState({ selectedAttractionId: attraction.id });
       setMarkerSelected(attraction.id, true);

       // Start generation
       abortController = new AbortController();

       try {
         const audioGuide = await generateAudioGuide(
           attraction,
           (status) => setAudioStatus(status),
           abortController.signal
         );

         setState({ currentAudioGuide: audioGuide });
         setAudioStatus('ready');

         return audioGuide;

       } catch (error) {
         if (error.name === 'AbortError') {
           // Selection changed, ignore
           return null;
         }

         setState({ error: { type: 'audio_generation', message: error.message, retryable: true } });
         setAudioStatus('error');
         throw error;
       }
     }

     export function cancelSelection() {
       if (abortController) {
         abortController.abort();
         abortController = null;
       }

       const currentState = getState();
       if (currentState.selectedAttractionId) {
         setMarkerSelected(currentState.selectedAttractionId, false);
       }

       resetAudioState();
       setState({ selectedAttractionId: null });
     }
     ```
- **Files**: `src/state/actions.js`
- **Parallel?**: No - depends on T052/T053
- **Notes**: AbortController cancels fetch requests

### Subtask T055 – Handle attraction selection during playback (stop and start new)

- **Purpose**: Stop current audio when selecting new attraction.
- **Steps**:
  1. Audio cleanup is already in T054's `selectAttraction`
  2. Ensure audio player UI is hidden:
     ```javascript
     // Add to selectAttraction, after cleanup
     import { hideAudioPlayer } from '../components/AudioPlayer.js';

     export async function selectAttraction(attraction) {
       // ... existing cleanup ...

       hideAudioPlayer(); // Hide previous player

       // ... rest of function ...
     }
     ```
  3. Handle case where same attraction is clicked while playing:
     ```javascript
     export async function selectAttraction(attraction) {
       const currentState = getState();

       // If clicking same attraction that's ready/playing, toggle playback
       if (currentState.selectedAttractionId === attraction.id && isAudioReady()) {
         // Don't regenerate, just return existing
         return currentState.currentAudioGuide;
       }

       // ... rest of selection logic ...
     }
     ```
- **Files**: `src/state/actions.js`
- **Parallel?**: No - enhancement to T054
- **Notes**: Don't regenerate if clicking same ready attraction

### Subtask T056 – Update map markers when viewport changes (remove out-of-view markers)

- **Purpose**: Keep marker count manageable as user pans.
- **Steps**:
  1. Create marker update logic in actions:
     ```javascript
     import { addAttractionMarker, removeAttractionMarker, clearAllMarkers, getMarkerCount } from '../components/AttractionMarker.js';
     import { getMap } from '../components/Map.js';

     export function updateAttractions(newAttractions) {
       const currentState = getState();
       const currentIds = new Set(currentState.attractions.map(a => a.id));
       const newIds = new Set(newAttractions.map(a => a.id));

       // Remove markers for attractions no longer in view
       currentState.attractions.forEach(attraction => {
         if (!newIds.has(attraction.id)) {
           removeAttractionMarker(attraction.id);
         }
       });

       // Add markers for new attractions
       const map = getMap();
       newAttractions.forEach(attraction => {
         if (!currentIds.has(attraction.id)) {
           addAttractionMarker(map, attraction, () => selectAttraction(attraction));
         }
       });

       // Preserve selection state
       if (currentState.selectedAttractionId && newIds.has(currentState.selectedAttractionId)) {
         setMarkerSelected(currentState.selectedAttractionId, true);
       }

       setState({ attractions: newAttractions });
     }
     ```
- **Files**: `src/state/actions.js`
- **Parallel?**: No - depends on marker component
- **Notes**: Only add/remove changed markers for performance

### Subtask T057 – Provide visual feedback for selected attraction marker

- **Purpose**: Make it clear which attraction is currently selected.
- **Steps**:
  1. Selection styling already in AttractionMarker.js (T028)
  2. Add additional visual feedback:
     ```css
     /* Enhanced selected state */
     .attraction-marker.selected .speaker-icon {
       background: #e3f2fd;
       transform: scale(1.2);
       box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4);
     }

     /* Pulsing animation while generating */
     .attraction-marker.generating .speaker-icon {
       animation: generating-pulse 1.5s infinite;
     }

     @keyframes generating-pulse {
       0%, 100% {
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
       }
       50% {
         box-shadow: 0 2px 16px rgba(26, 115, 232, 0.6);
       }
     }
     ```
  3. Add generating state to marker:
     ```javascript
     // In AttractionMarker.js
     export function setMarkerGenerating(attractionId, generating) {
       const marker = markers.get(attractionId);
       if (marker) {
         const el = marker.getElement();
         if (el) {
           el.classList.toggle('generating', generating);
         }
       }
     }
     ```
- **Files**: `src/style.css`, `src/components/AttractionMarker.js`
- **Parallel?**: No - enhancement to markers
- **Notes**: Visual distinction between selected and generating

### Subtask T058 – Add cancel button for in-progress generation

- **Purpose**: Allow user to cancel without selecting different attraction.
- **Steps**:
  1. Cancel button already exists in LoadingIndicator (T041)
  2. Wire up to state action:
     ```javascript
     // In main.js
     window.cancelAudioGeneration = () => {
       cancelSelection();
       hideGenerationProgress();
     };
     ```
  3. Ensure marker deselects on cancel:
     ```javascript
     // cancelSelection already handles this
     ```
- **Files**: Integration in main.js
- **Parallel?**: Yes - independent enhancement
- **Notes**: Cancel returns to idle state

## Integration: Wire state to UI

Update main.js to use state-driven approach:
```javascript
import { subscribe, getState, setState, isGenerating, isAudioReady } from './state/AppState.js';
import { selectAttraction, cancelSelection, updateAttractions } from './state/actions.js';
import { showGenerationProgress, hideGenerationProgress } from './components/LoadingIndicator.js';
import { showAudioPlayer, hideAudioPlayer, setPlayingState } from './components/AudioPlayer.js';
import { createAudioPlayer } from './services/audio.js';
import { setMarkerGenerating } from './components/AttractionMarker.js';

// Subscribe to state changes
subscribe((state) => {
  // Update generation progress
  if (isGenerating()) {
    showGenerationProgress(state.audioStatus);
    if (state.selectedAttractionId) {
      setMarkerGenerating(state.selectedAttractionId, true);
    }
  } else {
    hideGenerationProgress();
    if (state.selectedAttractionId) {
      setMarkerGenerating(state.selectedAttractionId, false);
    }
  }

  // Update audio player
  if (isAudioReady() && state.currentAudioGuide) {
    const attraction = state.attractions.find(a => a.id === state.selectedAttractionId);
    if (attraction) {
      showAudioPlayer(attraction.name);
    }
  }
});

// Handle attraction clicks (update from previous implementation)
function handleAttractionClick(attraction) {
  selectAttraction(attraction)
    .then(audioGuide => {
      if (audioGuide) {
        const player = createAudioPlayer(audioGuide.audioUrl);
        player.onEnded(() => setPlayingState(false));
      }
    })
    .catch(error => {
      if (error.name !== 'AbortError') {
        showGenerationError(error);
      }
    });
}

// Global cancel function
window.cancelAudioGeneration = () => {
  cancelSelection();
};
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Race conditions | AbortController, single source of truth |
| Memory leaks on rapid switching | Cleanup on every selection |
| State desync | Subscribe pattern keeps UI in sync |
| Too many state updates | Batch related updates |

## Definition of Done Checklist

- [ ] Selecting new attraction cancels in-progress generation
- [ ] Previous audio stops when selecting new attraction
- [ ] Selected marker has clear visual distinction
- [ ] Cancel button works during generation
- [ ] Markers update smoothly on viewport change
- [ ] No console errors on rapid clicking
- [ ] State stays consistent across all operations
- [ ] Clicking same ready attraction doesn't regenerate

## Review Guidance

- Test rapid clicking between attractions
- Verify no "zombie" audio plays after switching
- Check memory usage doesn't grow with repeated selections
- Confirm markers update without full clear/reload on pan

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
