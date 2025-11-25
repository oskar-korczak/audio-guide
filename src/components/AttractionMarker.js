// AttractionMarker.js - Speaker icon markers for tourist attractions

import L from 'leaflet';

const markers = new Map();
const attractionNames = new Map();

/**
 * Create speaker icon for attraction marker with label
 * @param {boolean} selected - Whether marker is selected
 * @param {string} name - Attraction name
 * @returns {L.DivIcon}
 */
function createSpeakerIcon(selected = false, name = '') {
  // Truncate name if too long
  const displayName = name.length > 20 ? name.slice(0, 18) + '...' : name;

  return L.divIcon({
    className: `attraction-marker ${selected ? 'selected' : ''}`,
    html: `
      <div class="marker-container">
        <div class="speaker-icon">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M3 9v6h4l5 5V4L7 9H3z" fill="${selected ? '#1a73e8' : '#666'}" />
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
                  fill="${selected ? '#1a73e8' : '#666'}" />
          </svg>
        </div>
        <div class="marker-label">${displayName}</div>
      </div>
    `,
    iconSize: [80, 50],
    iconAnchor: [40, 20]
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
    icon: createSpeakerIcon(false, attraction.name),
    interactive: true,
    bubblingMouseEvents: false
  })
    .addTo(map)
    .on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      onClick?.(attraction);
    });

  // Also handle touch events directly on the DOM element
  marker.once('add', () => {
    const el = marker.getElement();
    if (el) {
      el.style.pointerEvents = 'auto';
      el.addEventListener('touchend', (e) => {
        e.stopPropagation();
      }, { passive: true });
    }
  });

  markers.set(attraction.id, marker);
  attractionNames.set(attraction.id, attraction.name);
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
    attractionNames.delete(attractionId);
  }
}

/**
 * Clear all attraction markers from the map
 */
export function clearAllMarkers() {
  markers.forEach(marker => marker.remove());
  markers.clear();
  attractionNames.clear();
}

/**
 * Set marker selection state
 * @param {number|string} attractionId - Attraction ID
 * @param {boolean} selected - Selection state
 */
export function setMarkerSelected(attractionId, selected) {
  const marker = markers.get(attractionId);
  const name = attractionNames.get(attractionId) || '';
  if (marker) {
    marker.setIcon(createSpeakerIcon(selected, name));
  }
}

/**
 * Get current marker count
 * @returns {number}
 */
export function getMarkerCount() {
  return markers.size;
}

/**
 * Set marker generating state (for animation)
 * @param {number|string} attractionId - Attraction ID
 * @param {boolean} generating - Whether generation is in progress
 */
export function setMarkerGenerating(attractionId, generating) {
  const marker = markers.get(attractionId);
  if (marker) {
    const el = marker.getElement();
    if (el) {
      el.classList.toggle('generating', generating);
    }
  }
}
