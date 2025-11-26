// Map.js - Leaflet map initialization wrapper
import L from 'leaflet';

let map = null;

/**
 * Initialize the Leaflet map
 * @param {string} containerId - DOM element ID for the map container
 * @param {Object} options - Map options (center, zoom)
 * @returns {L.Map} The Leaflet map instance
 */
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
    tap: true,
    tapTolerance: 15,
    touchZoom: true,
    dragging: true
  });

  return map;
}

/**
 * Get the current map instance
 * @returns {L.Map|null}
 */
export function getMap() {
  return map;
}

/**
 * Add OpenStreetMap tile layer with attribution
 * @param {L.Map} mapInstance - The map to add tiles to
 */
export function addTileLayer(mapInstance) {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(mapInstance);
}

/**
 * Set the map center and optionally zoom level
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [zoom] - Optional zoom level
 */
export function setCenter(lat, lng, zoom) {
  if (map) {
    map.setView([lat, lng], zoom || map.getZoom());
  }
}

/**
 * Get the current viewport information
 * @returns {Object|null} Viewport with center, zoom, and bounds
 */
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

/**
 * Subscribe to viewport changes (moveend and zoomend events)
 * @param {Function} callback - Called with viewport data when map moves
 */
export function onViewportChange(callback) {
  if (!map) return;

  map.on('moveend', () => {
    callback(getViewport());
  });

  map.on('zoomend', () => {
    callback(getViewport());
  });
}
