// network.js - Network connectivity detection

let isOnline = navigator.onLine;
const listeners = new Set();
let offlineMessage = null;

/**
 * Initialize network detection
 */
export function initNetworkDetection() {
  window.addEventListener('online', () => {
    isOnline = true;
    hideOfflineMessage();
    notifyListeners(true);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    showOfflineMessage();
    notifyListeners(false);
  });
}

/**
 * Get current network status
 * @returns {boolean}
 */
export function getNetworkStatus() {
  return isOnline;
}

/**
 * Subscribe to network status changes
 * @param {Function} callback - Called with online status
 * @returns {Function} Unsubscribe function
 */
export function onNetworkChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Notify all listeners of network change
 * @param {boolean} online - Current online status
 */
function notifyListeners(online) {
  listeners.forEach(cb => cb(online));
}

/**
 * Show offline message banner
 */
function showOfflineMessage() {
  if (!offlineMessage) {
    offlineMessage = document.createElement('div');
    offlineMessage.className = 'offline-message';
    offlineMessage.innerHTML = `
      <span>You're offline. Some features may not work.</span>
    `;
    document.body.appendChild(offlineMessage);
  }
  offlineMessage.style.display = 'block';
}

/**
 * Hide offline message banner
 */
function hideOfflineMessage() {
  if (offlineMessage) {
    offlineMessage.style.display = 'none';
  }
}
