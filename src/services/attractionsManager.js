// attractionsManager.js - Manages attraction loading with debouncing and cancellation

import { fetchAttractionsWithRetry, transformAttractions } from './overpass.js';
import { debounce } from '../utils/debounce.js';

let currentAttractions = [];
let abortController = null;

/**
 * Get current loaded attractions
 * @returns {Array<Object>} Current attractions
 */
export function getAttractions() {
  return currentAttractions;
}

/**
 * Load attractions for a given bounding box
 * @param {Object} bounds - Bounding box {south, west, north, east}
 * @param {Function} onLoading - Called when loading starts
 * @param {Function} onLoaded - Called with attractions array when loaded
 * @param {Function} onError - Called with error if request fails
 */
async function loadAttractions(bounds, onLoading, onLoaded, onError) {
  // Cancel previous request
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  onLoading?.();

  try {
    const response = await fetchAttractionsWithRetry(bounds, abortController.signal);
    currentAttractions = transformAttractions(response);
    onLoaded?.(currentAttractions);
  } catch (error) {
    if (error.name === 'AbortError') {
      // Request was cancelled, ignore
      return;
    }
    onError?.(error);
  }
}

/**
 * Debounced version of loadAttractions (500ms)
 */
export const debouncedLoadAttractions = debounce(loadAttractions, 500);

/**
 * Cancel any pending attraction load
 */
export function cancelLoadAttractions() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}
