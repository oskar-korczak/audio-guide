---
work_package_id: "WP06"
subtasks:
  - "T044"
  - "T045"
  - "T046"
  - "T047"
  - "T048"
  - "T049"
  - "T050"
  - "T051"
title: "Audio Playback Controls"
phase: "Phase 2 - User Story 2"
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

# Work Package Prompt: WP06 – Audio Playback Controls

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Implement audio playback service with iOS Chrome compatibility
- Create play/pause UI controls that appear after generation completes
- Handle iOS autoplay restrictions with unlock pattern
- Manage blob URL lifecycle to prevent memory leaks

**Success**: Play button appears after generation, audio starts within 1 second of clicking play (SC-005), plays continuously without interruption (SC-006).

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - User Story 2, FR-011, SC-005/006
- **Research Reference**: [research.md](../../research.md) - Section 4: iOS Chrome Audio Autoplay
- **Contract Reference**: [contracts/elevenlabs-api.md](../../contracts/elevenlabs-api.md) - iOS considerations
- **Dependencies**: WP05 (audio blob generation)

**Critical iOS Constraints**:
- First audio play MUST be from user gesture (click)
- Use Blob URLs with `audio/mpeg` MIME type
- Base64 data URIs DO NOT work on iOS
- Unlock audio on first attraction click before generation starts

## Subtasks & Detailed Guidance

### Subtask T044 – Create `src/services/audio.js` - Audio playback service

- **Purpose**: Encapsulate HTMLAudioElement playback with state management.
- **Steps**:
  1. Create `src/services/audio.js`:
     ```javascript
     let currentAudio = null;
     let currentUrl = null;

     export function createAudioPlayer(blobUrl) {
       // Cleanup previous
       cleanup();

       currentUrl = blobUrl;
       currentAudio = new Audio();
       currentAudio.src = blobUrl;

       return {
         audio: currentAudio,
         play: () => play(),
         pause: () => pause(),
         stop: () => stop(),
         getDuration: () => getDuration(),
         getCurrentTime: () => currentAudio?.currentTime || 0,
         isPlaying: () => isPlaying(),
         onEnded: (callback) => {
           if (currentAudio) {
             currentAudio.addEventListener('ended', callback);
           }
         },
         onTimeUpdate: (callback) => {
           if (currentAudio) {
             currentAudio.addEventListener('timeupdate', callback);
           }
         }
       };
     }

     async function play() {
       if (!currentAudio) return false;
       try {
         await currentAudio.play();
         return true;
       } catch (error) {
         console.error('Playback failed:', error);
         return false;
       }
     }

     function pause() {
       if (currentAudio) {
         currentAudio.pause();
       }
     }

     function stop() {
       if (currentAudio) {
         currentAudio.pause();
         currentAudio.currentTime = 0;
       }
     }

     function isPlaying() {
       return currentAudio && !currentAudio.paused && !currentAudio.ended;
     }

     async function getDuration() {
       if (!currentAudio) return 0;

       // Wait for metadata if not loaded
       if (currentAudio.readyState < 1) {
         await new Promise((resolve) => {
           currentAudio.addEventListener('loadedmetadata', resolve, { once: true });
           currentAudio.load();
         });
       }

       return currentAudio.duration;
     }

     export function cleanup() {
       if (currentAudio) {
         currentAudio.pause();
         currentAudio.src = '';
         currentAudio = null;
       }
       if (currentUrl) {
         URL.revokeObjectURL(currentUrl);
         currentUrl = null;
       }
     }

     export function getCurrentPlayer() {
       return currentAudio ? {
         play: () => play(),
         pause: () => pause(),
         isPlaying: () => isPlaying()
       } : null;
     }
     ```
- **Files**: `src/services/audio.js`
- **Parallel?**: No - foundational service
- **Notes**: Single player instance to prevent multiple audio streams

### Subtask T045 – Implement iOS audio unlock pattern

- **Purpose**: Unlock iOS audio context on first user interaction.
- **Steps**:
  1. Add to `src/services/audio.js`:
     ```javascript
     let audioUnlocked = false;

     // Tiny silent MP3 (minimal valid MP3)
     const SILENT_AUDIO = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYHO0JJAAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEAAQB4HXuDzgABCgqsA5lGIABhYxBTBz4PoOwMABgEAEHMABjAGPg+QBg//tYZAkAA1YxSgU94AI1BWigqCABAAAAAPcAAAAAAAAAANWMDuAxBUAAAB//9AAAAAAwAAAAAwAAAADgAAAAMAAAAA4ABAACAAAJmAAAAAAAAAAAbgEEEEE=';

     export async function unlockAudio() {
       if (audioUnlocked) return true;

       try {
         const audio = new Audio();
         audio.src = SILENT_AUDIO;
         audio.volume = 0.01; // Nearly silent

         await audio.play();
         audio.pause();
         audio.src = '';

         audioUnlocked = true;
         console.log('Audio unlocked for iOS');
         return true;
       } catch (error) {
         console.warn('Audio unlock failed:', error);
         return false;
       }
     }

     export function isAudioUnlocked() {
       return audioUnlocked;
     }
     ```
  2. Call `unlockAudio()` on first attraction click (before generation starts)
- **Files**: `src/services/audio.js`
- **Parallel?**: No - part of audio service
- **Notes**: Must be called within user gesture context

### Subtask T046 – Create Blob URL management with cleanup on playback end

- **Purpose**: Prevent memory leaks from blob URLs.
- **Steps**:
  1. Already partially handled in T044 cleanup function
  2. Ensure cleanup is called:
     - When new audio is generated
     - When user selects different attraction
     - When component unmounts (page unload)
  3. Add page unload cleanup:
     ```javascript
     // In main.js
     window.addEventListener('beforeunload', () => {
       cleanup();
     });
     ```
- **Files**: `src/services/audio.js`, `src/main.js`
- **Parallel?**: No - part of audio service
- **Notes**: Blob URLs consume memory until revoked

### Subtask T047 – Create `src/components/AudioPlayer.js` - Play/pause UI component

- **Purpose**: Visual controls for audio playback.
- **Steps**:
  1. Create `src/components/AudioPlayer.js`:
     ```javascript
     import { getCurrentPlayer } from '../services/audio.js';

     let playerElement = null;
     let isPlaying = false;

     export function showAudioPlayer(attractionName, onPlayPause) {
       if (!playerElement) {
         playerElement = document.createElement('div');
         playerElement.className = 'audio-player';
         document.body.appendChild(playerElement);
       }

       isPlaying = false;
       updatePlayerUI(attractionName);
       playerElement.style.display = 'flex';

       // Store callback for play/pause
       playerElement.dataset.attractionName = attractionName;
       window._audioPlayerCallback = onPlayPause;
     }

     function updatePlayerUI(attractionName) {
       playerElement.innerHTML = `
         <div class="player-info">
           <div class="player-title">${attractionName}</div>
           <div class="player-status">${isPlaying ? 'Playing...' : 'Ready to play'}</div>
         </div>
         <button class="play-pause-btn" onclick="window.toggleAudioPlayback()">
           ${isPlaying ? getPauseIcon() : getPlayIcon()}
         </button>
       `;
     }

     export function hideAudioPlayer() {
       if (playerElement) {
         playerElement.style.display = 'none';
       }
     }

     export function setPlayingState(playing) {
       isPlaying = playing;
       if (playerElement) {
         const name = playerElement.dataset.attractionName || 'Audio Guide';
         updatePlayerUI(name);
       }
     }

     // Global toggle function for button click
     window.toggleAudioPlayback = () => {
       const player = getCurrentPlayer();
       if (!player) return;

       if (player.isPlaying()) {
         player.pause();
         setPlayingState(false);
       } else {
         player.play();
         setPlayingState(true);
       }

       window._audioPlayerCallback?.(!isPlaying);
     };

     function getPlayIcon() {
       return `
         <svg viewBox="0 0 24 24" width="32" height="32">
           <path d="M8 5v14l11-7z" fill="white"/>
         </svg>
       `;
     }

     function getPauseIcon() {
       return `
         <svg viewBox="0 0 24 24" width="32" height="32">
           <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="white"/>
         </svg>
       `;
     }
     ```
- **Files**: `src/components/AudioPlayer.js`
- **Parallel?**: Yes - can develop alongside audio service
- **Notes**: Floating player at bottom of screen

### Subtask T048 – Design play/pause button with clear visual states

- **Purpose**: Style the audio player controls.
- **Steps**:
  1. Add CSS to `src/style.css`:
     ```css
     .audio-player {
       position: fixed;
       bottom: 20px;
       left: 20px;
       right: 20px;
       background: white;
       border-radius: 16px;
       box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
       padding: 12px 16px;
       display: flex;
       align-items: center;
       justify-content: space-between;
       z-index: 1000;
     }

     .player-info {
       flex: 1;
       margin-right: 16px;
       overflow: hidden;
     }

     .player-title {
       font-weight: 600;
       font-size: 15px;
       color: #333;
       white-space: nowrap;
       overflow: hidden;
       text-overflow: ellipsis;
     }

     .player-status {
       font-size: 13px;
       color: #666;
       margin-top: 2px;
     }

     .play-pause-btn {
       width: 56px;
       height: 56px;
       border-radius: 50%;
       background: #4285f4;
       border: none;
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       flex-shrink: 0;
       transition: transform 0.15s ease, background 0.15s ease;
     }

     .play-pause-btn:hover {
       background: #1a73e8;
       transform: scale(1.05);
     }

     .play-pause-btn:active {
       transform: scale(0.95);
     }

     .play-pause-btn svg {
       margin-left: 2px; /* Visual centering for play icon */
     }
     ```
- **Files**: `src/style.css`
- **Parallel?**: Yes - independent CSS work
- **Notes**: Large touch target (56px) for mobile

### Subtask T049 – Handle audio end event (return to play state)

- **Purpose**: Reset UI when audio finishes playing.
- **Steps**:
  1. Add event handling in integration:
     ```javascript
     // After creating audio player
     const player = createAudioPlayer(audioGuide.audioUrl);

     player.onEnded(() => {
       setPlayingState(false);
       // Optionally show "Replay" instead of "Play"
     });
     ```
  2. Update AudioPlayer to show replay state:
     ```javascript
     // In updatePlayerUI
     const statusText = isPlaying ? 'Playing...' : hasEnded ? 'Finished - tap to replay' : 'Ready to play';
     ```
- **Files**: `src/components/AudioPlayer.js`, integration in main.js
- **Parallel?**: No - depends on player setup
- **Notes**: User can replay by clicking play again

### Subtask T050 – Position audio player on map UI (floating control)

- **Purpose**: Ensure player doesn't obstruct map interaction.
- **Steps**:
  1. Player is already positioned fixed at bottom (T048 CSS)
  2. Ensure it doesn't overlap with other UI:
     ```css
     /* Adjust generation progress position when player is visible */
     .audio-player ~ .generation-progress {
       bottom: 100px; /* Above audio player */
     }

     /* Ensure map controls aren't hidden */
     .leaflet-control-container {
       z-index: 500; /* Below audio player */
     }
     ```
  3. Add safe area padding for iOS:
     ```css
     .audio-player {
       padding-bottom: calc(12px + env(safe-area-inset-bottom));
     }
     ```
- **Files**: `src/style.css`
- **Parallel?**: No - CSS refinement
- **Notes**: Safe area for iPhone notch/home indicator

### Subtask T051 – Implement replay capability

- **Purpose**: Allow user to listen to audio guide again.
- **Steps**:
  1. Replay is already supported - play() works after audio ends
  2. Add visual indication:
     ```javascript
     let hasPlayed = false;
     let hasEnded = false;

     export function showAudioPlayer(attractionName, onPlayPause) {
       hasPlayed = false;
       hasEnded = false;
       // ... rest of initialization
     }

     // In onEnded callback
     hasEnded = true;
     updatePlayerUI(attractionName);

     // Update status text
     function getStatusText() {
       if (isPlaying) return 'Playing...';
       if (hasEnded) return 'Tap to replay';
       if (hasPlayed) return 'Paused';
       return 'Tap to play';
     }
     ```
- **Files**: `src/components/AudioPlayer.js`
- **Parallel?**: No - enhancement to player
- **Notes**: Clear indication that replay is available

## Integration: Complete audio flow

Full integration after all subtasks:
```javascript
import { createAudioPlayer, cleanup, unlockAudio } from './services/audio.js';
import { showAudioPlayer, hideAudioPlayer, setPlayingState } from './components/AudioPlayer.js';
import { generateAudioGuide, cleanupAudioGuide } from './services/audioGuideGenerator.js';

let currentAudioGuide = null;
let audioPlayer = null;

async function handleAttractionClick(attraction) {
  // Unlock audio on first click (iOS requirement)
  await unlockAudio();

  // ... cancel previous, cleanup, etc. (from WP05) ...

  try {
    currentAudioGuide = await generateAudioGuide(
      attraction,
      (status) => showGenerationProgress(status),
      currentAbortController.signal
    );

    hideGenerationProgress();

    // Create audio player
    audioPlayer = createAudioPlayer(currentAudioGuide.audioUrl);

    // Show player UI
    showAudioPlayer(attraction.name, (isPlaying) => {
      console.log('Playback state:', isPlaying);
    });

    // Handle audio end
    audioPlayer.onEnded(() => {
      setPlayingState(false);
    });

  } catch (error) {
    if (error.name !== 'AbortError') {
      showGenerationError(error);
    }
  }
}

// Cleanup when selecting new attraction
function cleanupCurrentAudio() {
  hideAudioPlayer();
  cleanup(); // From audio.js
  if (currentAudioGuide) {
    cleanupAudioGuide(currentAudioGuide);
    currentAudioGuide = null;
  }
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| iOS autoplay blocked | Unlock on first click |
| Memory leaks | Revoke blob URLs on cleanup |
| Audio doesn't start | Check unlocked state, handle errors |
| Player overlaps content | Safe area padding, z-index management |

## Definition of Done Checklist

- [ ] Play button appears after audio generation completes
- [ ] Clicking play starts audio within 1 second (SC-005)
- [ ] Pause button appears while playing
- [ ] Audio plays without interruption (SC-006)
- [ ] Audio ends and button returns to play state
- [ ] Replay works after audio finishes
- [ ] Audio works on iOS Chrome (tested on device)
- [ ] No memory leaks (blob URLs cleaned up)
- [ ] Player doesn't obstruct map controls

## Review Guidance

- Test audio on actual iOS device (critical)
- Verify play starts quickly (< 1s)
- Check pause/resume works mid-playback
- Confirm replay works after audio ends
- Verify memory cleanup by checking DevTools memory

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
