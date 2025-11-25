// Interactive Audio Tour Guide
// Entry point - initializes map and services

import './style.css';
import { initMap, addTileLayer, setCenter, onViewportChange, getViewport, getMap } from './components/Map.js';
import { watchPosition, requestGeolocationPermission } from './services/geolocation.js';
import { watchOrientation, requestOrientationPermission, isPermissionRequired } from './services/orientation.js';
import { createUserMarker, updateUserPosition, updateUserHeading } from './components/UserMarker.js';
import { debouncedLoadAttractions } from './services/attractionsManager.js';
import { addAttractionMarker, clearAllMarkers, setMarkerSelected } from './components/AttractionMarker.js';
import { generateAudioGuide, cleanupAudioGuide } from './services/audioGuideGenerator.js';
import { showGenerationProgress, hideGenerationProgress, showGenerationError } from './components/LoadingIndicator.js';
import { createAudioPlayer, cleanup as cleanupAudio, unlockAudio } from './services/audio.js';
import { showAudioPlayer, hideAudioPlayer, setPlayingState, setAudioEnded } from './components/AudioPlayer.js';

// Initialize map
const map = initMap('map');
addTileLayer(map);

let hasInitialLocation = false;

// Audio generation state
let currentAbortController = null;
let currentAudioGuide = null;
let lastSelectedAttraction = null;
let selectedAttractionId = null;
let audioPlayer = null;

/**
 * Cleanup current audio resources
 */
function cleanupCurrentAudio() {
  hideAudioPlayer();
  cleanupAudio();
  if (currentAudioGuide) {
    cleanupAudioGuide(currentAudioGuide);
    currentAudioGuide = null;
  }
  audioPlayer = null;
}

/**
 * Handle attraction marker click - start audio generation
 */
async function handleAttractionClick(attraction) {
  // Unlock audio on first click (iOS requirement)
  await unlockAudio();

  // Deselect previous marker
  if (selectedAttractionId !== null) {
    setMarkerSelected(selectedAttractionId, false);
  }

  // Select new marker
  selectedAttractionId = attraction.id;
  setMarkerSelected(attraction.id, true);

  // Cancel any existing generation
  if (currentAbortController) {
    currentAbortController.abort();
  }

  // Cleanup previous audio
  cleanupCurrentAudio();

  lastSelectedAttraction = attraction;
  currentAbortController = new AbortController();

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
      setAudioEnded();
    });

    console.log('Audio ready:', currentAudioGuide.audioUrl);

  } catch (error) {
    if (error.name !== 'AbortError') {
      showGenerationError(error);
    }
  }
}

// Expose cancel function for cancel button
window.cancelAudioGeneration = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    hideGenerationProgress();
  }

  // Cleanup audio
  cleanupCurrentAudio();

  // Deselect marker
  if (selectedAttractionId !== null) {
    setMarkerSelected(selectedAttractionId, false);
    selectedAttractionId = null;
  }
};

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
  cleanupCurrentAudio();
});

// Expose retry function for retry button
window.retryAudioGeneration = () => {
  if (lastSelectedAttraction) {
    handleAttractionClick(lastSelectedAttraction);
  }
};

/**
 * Show message when location permission is denied
 */
function showLocationDeniedMessage() {
  const message = document.createElement('div');
  message.className = 'location-denied-message';
  message.innerHTML = `
    <p>Location access was denied.</p>
    <p>You can still explore the map manually.</p>
    <button onclick="this.parentElement.remove()">Dismiss</button>
  `;
  document.body.appendChild(message);
}

/**
 * Initialize compass orientation tracking
 */
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

/**
 * Initialize location tracking
 */
async function initLocation() {
  const result = await requestGeolocationPermission();

  if (result.status === 'granted') {
    watchPosition(
      (position) => {
        if (!hasInitialLocation) {
          // Center map on first location fix
          setCenter(position.latitude, position.longitude, 16);
          createUserMarker(map, position.latitude, position.longitude);
          hasInitialLocation = true;

          // Request orientation permission after location (requires user gesture context on iOS)
          // Note: This may not work without explicit user gesture - see note below
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

// Start location initialization
initLocation();

/**
 * Show loading indicator during attraction fetch
 */
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

/**
 * Hide loading indicator
 */
function hideAttractionsLoading() {
  const indicator = document.getElementById('attractions-loading');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * Show message when no attractions found
 */
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

/**
 * Handle viewport changes - load attractions for new area
 */
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

      // Limit markers for iOS performance
      const limitedAttractions = attractions.slice(0, 100);

      limitedAttractions.forEach(attraction => {
        addAttractionMarker(getMap(), attraction, handleAttractionClick);
      });

      console.log(`Loaded ${limitedAttractions.length} attractions`);
    },
    (error) => {
      hideAttractionsLoading();
      console.error('Failed to load attractions:', error);
      // Error handling will be enhanced in WP08
    }
  );
}

onViewportChange(handleViewportChange);

// Trigger initial load after map is ready
const initialViewport = getViewport();
if (initialViewport) {
  handleViewportChange(initialViewport);
}

console.log('Audio Tour Guide initialized');
