// geolocation.js - Browser Geolocation API wrapper

let watchId = null;

/**
 * Check if geolocation is supported
 * @returns {boolean}
 */
export function isGeolocationSupported() {
  return 'geolocation' in navigator;
}

/**
 * Request geolocation permission by attempting to get current position
 * @returns {Promise<{status: string, error?: string}>}
 */
export async function requestGeolocationPermission() {
  if (!isGeolocationSupported()) {
    return { status: 'unavailable' };
  }

  try {
    // Try to get current position to trigger permission prompt
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: true
      });
    });
    return { status: 'granted' };
  } catch (error) {
    if (error.code === error.PERMISSION_DENIED) {
      return { status: 'denied' };
    }
    return { status: 'error', error: error.message };
  }
}

/**
 * Watch user position continuously
 * @param {Function} onUpdate - Called with position data {latitude, longitude, accuracy, timestamp}
 * @param {Function} onError - Called with error {type, message}
 * @returns {number|null} Watch ID or null if not supported
 */
export function watchPosition(onUpdate, onError) {
  if (!isGeolocationSupported()) {
    onError?.({ type: 'unavailable', message: 'Geolocation not supported' });
    return null;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
    },
    (error) => {
      let errorType = 'unknown';
      let message = error.message;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorType = 'denied';
          message = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorType = 'unavailable';
          message = 'Location unavailable';
          break;
        case error.TIMEOUT:
          errorType = 'timeout';
          message = 'Location request timed out';
          break;
      }

      onError?.({ type: errorType, message });
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    }
  );

  return watchId;
}

/**
 * Stop watching position
 */
export function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}
