// Interactive Audio Tour Guide
// Entry point - initializes map and services

import './style.css';
import { initMap, addTileLayer, setCenter, onViewportChange, getViewport, getMap } from './components/Map.js';
import { watchPosition, requestGeolocationPermission } from './services/geolocation.js';
import { watchOrientation, requestOrientationPermission, isPermissionRequired } from './services/orientation.js';
import { createUserMarker, updateUserPosition, updateUserHeading } from './components/UserMarker.js';
import { debouncedLoadAttractions } from './services/attractionsManager.js';
import { clearAllMarkers } from './components/AttractionMarker.js';
import { showGenerationProgress, hideGenerationProgress, showGenerationError } from './components/LoadingIndicator.js';
import { createAudioPlayer, cleanup as cleanupAudio } from './services/audio.js';
import { showAudioPlayer, hideAudioPlayer, setPlayingState, setAudioEnded } from './components/AudioPlayer.js';
import { subscribe, getState, isGenerating, isAudioReady, getSelectedAttraction } from './state/AppState.js';
import { selectAttraction, cancelSelection, updateAttractions, setAttractionsLoading } from './state/actions.js';
import { initErrorBoundary } from './utils/errorBoundary.js';
import { initNetworkDetection } from './utils/network.js';
import { showError, startTimeoutWarning, clearTimeoutWarning, showTimeoutWarning } from './components/ErrorMessage.js';

// Initialize error handling first
initErrorBoundary();
initNetworkDetection();

// Initialize map
const map = initMap('map');
addTileLayer(map);

let hasInitialLocation = false;
let audioPlayer = null;
let lastSelectedAttraction = null;

// Subscribe to state changes for UI updates
subscribe((state) => {
  // Update generation progress
  if (isGenerating()) {
    showGenerationProgress(state.audioStatus);
  } else {
    hideGenerationProgress();
  }

  // Update audio player when ready
  if (isAudioReady() && state.currentAudioGuide && !audioPlayer) {
    const attraction = getSelectedAttraction();
    if (attraction) {
      audioPlayer = createAudioPlayer(state.currentAudioGuide.audioUrl);
      showAudioPlayer(attraction.name, (isPlaying) => {
        console.log('Playback state:', isPlaying);
      });
      audioPlayer.onEnded(() => {
        setAudioEnded();
      });
    }
  }

  // Hide audio player when no audio
  if (!isAudioReady() || !state.currentAudioGuide) {
    if (audioPlayer) {
      hideAudioPlayer();
      audioPlayer = null;
    }
  }
});

/**
 * Handle attraction marker click - use state management
 */
async function handleAttractionClick(attraction) {
  lastSelectedAttraction = attraction;
  audioPlayer = null; // Clear reference so subscriber can create new one

  // Start timeout warning
  startTimeoutWarning(showTimeoutWarning, 30000);

  try {
    await selectAttraction(attraction);
  } catch (error) {
    if (error.name !== 'AbortError') {
      handleAPIError(error);
    }
  } finally {
    clearTimeoutWarning();
  }
}

/**
 * Handle API errors with specific messages
 */
function handleAPIError(error) {
  let title = 'Generation Failed';
  let message = 'Unable to generate audio guide. Please try again.';
  let retryable = true;

  // OpenAI specific errors
  if (error.status === 401) {
    title = 'Invalid API Key';
    message = 'The API key is invalid. Please check your configuration.';
    retryable = false;
  } else if (error.status === 429) {
    message = 'Rate limit reached. Please wait a moment and try again.';
  } else if (error.code === 'insufficient_quota') {
    title = 'API Quota Exceeded';
    message = 'Your API account has run out of credits. Please check your billing.';
    retryable = false;
  } else if (error.status === 422) {
    message = 'The content could not be processed. Please try a different attraction.';
  }

  showError({
    title,
    message,
    retryable,
    onRetry: () => {
      if (lastSelectedAttraction) {
        handleAttractionClick(lastSelectedAttraction);
      }
    }
  });
}

// Expose cancel function for cancel button
window.cancelAudioGeneration = () => {
  cancelSelection();
};

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
  cancelSelection();
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
  showError({
    title: 'Location Unavailable',
    message: 'Location access was denied. You can still explore the map and generate audio guides manually.',
    autoHide: 5000
  });
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
      setAttractionsLoading(true);
    },
    (attractions) => {
      hideAttractionsLoading();
      setAttractionsLoading(false);

      if (attractions.length === 0) {
        showNoAttractionsMessage();
        clearAllMarkers();
        return;
      }

      // Limit markers for iOS performance
      const limitedAttractions = attractions.slice(0, 100);

      // Use state management for diff-based marker updates
      updateAttractions(limitedAttractions, handleAttractionClick);

      console.log(`Loaded ${limitedAttractions.length} attractions`);
    },
    (error) => {
      hideAttractionsLoading();
      setAttractionsLoading(false);
      console.error('Failed to load attractions:', error);

      let title = 'Failed to Load Attractions';
      let message = 'Unable to find nearby attractions. Please try again.';

      if (error.message === 'RATE_LIMITED') {
        message = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message === 'TIMEOUT') {
        message = 'The request took too long. Try zooming in for a smaller area.';
      }

      showError({
        title,
        message,
        retryable: true,
        onRetry: () => {
          const viewport = getViewport();
          if (viewport) {
            handleViewportChange(viewport);
          }
        }
      });
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
