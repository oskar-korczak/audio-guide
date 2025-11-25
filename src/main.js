// Interactive Audio Tour Guide
// Entry point - initializes map and services

import './style.css';
import { initMap, addTileLayer, setCenter, onViewportChange, getViewport } from './components/Map.js';
import { debounce } from './utils/debounce.js';
import { watchPosition, requestGeolocationPermission } from './services/geolocation.js';
import { watchOrientation, requestOrientationPermission, isPermissionRequired } from './services/orientation.js';
import { createUserMarker, updateUserPosition, updateUserHeading } from './components/UserMarker.js';

// Initialize map
const map = initMap('map');
addTileLayer(map);

let hasInitialLocation = false;

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

// Viewport changes (for attractions loading in WP04)
const handleViewportChange = debounce((viewport) => {
  console.log('Viewport changed:', viewport);
}, 500);

onViewportChange(handleViewportChange);

console.log('Audio Tour Guide initialized');
