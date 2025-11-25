// UserMarker.js - Directional arrow marker for user location
import L from 'leaflet';

let userMarker = null;
let currentHeading = 0;

/**
 * Create the arrow icon SVG with rotation
 * @param {number} heading - Compass heading in degrees (0 = north)
 * @returns {L.DivIcon}
 */
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

/**
 * Create the user marker at a location
 * @param {L.Map} map - Leaflet map instance
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} heading - Initial compass heading
 * @returns {L.Marker}
 */
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

/**
 * Update the user marker position
 * @param {number} lat - New latitude
 * @param {number} lng - New longitude
 */
export function updateUserPosition(lat, lng) {
  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  }
}

/**
 * Update the user marker heading (rotation)
 * @param {number} heading - New compass heading in degrees
 */
export function updateUserHeading(heading) {
  if (userMarker && heading !== currentHeading) {
    currentHeading = heading;
    userMarker.setIcon(createArrowIcon(heading));
  }
}

/**
 * Remove the user marker from the map
 */
export function removeUserMarker() {
  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }
}

/**
 * Check if user marker exists
 * @returns {boolean}
 */
export function hasUserMarker() {
  return userMarker !== null;
}
