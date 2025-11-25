// AttractionMarker.js - Speaker icon markers for tourist attractions

import L from 'leaflet';

const markers = new Map();

/**
 * Create speaker icon for attraction marker
 * @param {boolean} selected - Whether marker is selected
 * @returns {L.DivIcon}
 */
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

/**
 * Add an attraction marker to the map
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} attraction - Attraction object
 * @param {Function} onClick - Click handler
 * @returns {L.Marker}
 */
export function addAttractionMarker(map, attraction, onClick) {
  const marker = L.marker([attraction.latitude, attraction.longitude], {
    icon: createSpeakerIcon(false)
  })
    .addTo(map)
    .on('click', () => onClick?.(attraction));

  markers.set(attraction.id, marker);
  return marker;
}

/**
 * Remove a specific attraction marker
 * @param {number|string} attractionId - Attraction ID
 */
export function removeAttractionMarker(attractionId) {
  const marker = markers.get(attractionId);
  if (marker) {
    marker.remove();
    markers.delete(attractionId);
  }
}

/**
 * Clear all attraction markers from the map
 */
export function clearAllMarkers() {
  markers.forEach(marker => marker.remove());
  markers.clear();
}

/**
 * Set marker selection state
 * @param {number|string} attractionId - Attraction ID
 * @param {boolean} selected - Selection state
 */
export function setMarkerSelected(attractionId, selected) {
  const marker = markers.get(attractionId);
  if (marker) {
    marker.setIcon(createSpeakerIcon(selected));
  }
}

/**
 * Get current marker count
 * @returns {number}
 */
export function getMarkerCount() {
  return markers.size;
}
