// orientation.js - Device compass heading service for iOS

let orientationCallback = null;

/**
 * Check if device orientation is supported
 * @returns {boolean}
 */
export function isOrientationSupported() {
  return 'DeviceOrientationEvent' in window;
}

/**
 * Check if iOS-style permission request is required
 * @returns {boolean}
 */
export function isPermissionRequired() {
  return typeof DeviceOrientationEvent.requestPermission === 'function';
}

/**
 * Request orientation permission (iOS 13+ requires explicit permission)
 * MUST be called from a user gesture (button click)
 * @returns {Promise<{status: string, error?: string}>}
 */
export async function requestOrientationPermission() {
  if (!isOrientationSupported()) {
    return { status: 'unavailable' };
  }

  if (!isPermissionRequired()) {
    // Non-iOS: permission not needed
    return { status: 'granted' };
  }

  try {
    const permission = await DeviceOrientationEvent.requestPermission();
    return { status: permission };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Watch device orientation for compass heading
 * @param {Function} onHeadingUpdate - Called with heading (0-360 degrees from north)
 * @returns {boolean} Whether watching started successfully
 */
export function watchOrientation(onHeadingUpdate) {
  if (!isOrientationSupported()) {
    return false;
  }

  // Throttle updates to 100ms
  let lastUpdate = 0;
  const THROTTLE_MS = 100;

  function handleOrientation(event) {
    const now = Date.now();
    if (now - lastUpdate < THROTTLE_MS) return;
    lastUpdate = now;

    // iOS: use webkitCompassHeading (true north)
    // Android: convert alpha (360 - alpha for approximate heading)
    let heading = null;

    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }

    if (heading !== null) {
      onHeadingUpdate(heading);
    }
  }

  window.addEventListener('deviceorientation', handleOrientation, true);
  orientationCallback = handleOrientation;

  return true;
}

/**
 * Stop watching device orientation
 */
export function stopWatchingOrientation() {
  if (orientationCallback) {
    window.removeEventListener('deviceorientation', orientationCallback, true);
    orientationCallback = null;
  }
}
