// ErrorMessage.js - Reusable error toast component

/**
 * Show an error toast message
 * @param {Object} options - Error options
 * @param {string} options.title - Error title
 * @param {string} options.message - Error message
 * @param {boolean} options.retryable - Whether retry is available
 * @param {Function} options.onRetry - Retry callback
 * @param {Function} options.onDismiss - Dismiss callback
 * @param {number} options.autoHide - Auto-hide after ms (0 for no auto-hide)
 * @returns {Object} Control object with dismiss method
 */
export function showError(options) {
  const {
    title = 'Error',
    message,
    retryable = false,
    onRetry,
    onDismiss,
    autoHide = 0
  } = options;

  const errorEl = document.createElement('div');
  errorEl.className = 'error-toast';

  errorEl.innerHTML = `
    <div class="error-toast-icon">!</div>
    <div class="error-toast-content">
      <div class="error-toast-title">${title}</div>
      <div class="error-toast-message">${message}</div>
    </div>
    <div class="error-toast-actions">
      ${retryable ? `<button class="retry-btn">Retry</button>` : ''}
      <button class="dismiss-btn">&times;</button>
    </div>
  `;

  // Wire up buttons
  const retryBtn = errorEl.querySelector('.retry-btn');
  const dismissBtn = errorEl.querySelector('.dismiss-btn');

  if (retryBtn) {
    retryBtn.onclick = () => {
      errorEl.remove();
      onRetry?.();
    };
  }

  dismissBtn.onclick = () => {
    errorEl.remove();
    onDismiss?.();
  };

  document.body.appendChild(errorEl);

  // Auto-hide
  if (autoHide > 0) {
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.remove();
      }
    }, autoHide);
  }

  return {
    dismiss: () => errorEl.remove()
  };
}

// Timeout warning support
let timeoutWarningTimer = null;

/**
 * Start a timeout warning timer
 * @param {Function} onTimeout - Called when timeout occurs
 * @param {number} timeoutMs - Timeout in milliseconds
 */
export function startTimeoutWarning(onTimeout, timeoutMs = 30000) {
  clearTimeoutWarning();
  timeoutWarningTimer = setTimeout(() => {
    onTimeout();
  }, timeoutMs);
}

/**
 * Clear the timeout warning timer
 */
export function clearTimeoutWarning() {
  if (timeoutWarningTimer) {
    clearTimeout(timeoutWarningTimer);
    timeoutWarningTimer = null;
  }
}

/**
 * Show a timeout warning message
 */
export function showTimeoutWarning() {
  const warning = document.createElement('div');
  warning.className = 'timeout-warning';
  warning.innerHTML = `
    <span>This is taking longer than expected...</span>
    <button onclick="this.parentElement.remove()">Dismiss</button>
  `;
  document.body.appendChild(warning);

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (warning.parentNode) {
      warning.remove();
    }
  }, 10000);
}
