// errorBoundary.js - Global error handling for uncaught exceptions

let errorContainer = null;

/**
 * Initialize global error boundary
 */
export function initErrorBoundary() {
  // Global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('Uncaught error:', error);
    showFatalError('An unexpected error occurred. Please refresh the page.');
    return true; // Prevent default handling
  };

  // Unhandled promise rejections
  window.onunhandledrejection = (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show fatal error for promise rejections - they're usually handled elsewhere
    event.preventDefault();
  };
}

/**
 * Show a fatal error overlay requiring page refresh
 * @param {string} message - Error message to display
 */
export function showFatalError(message) {
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.className = 'fatal-error';
    document.body.appendChild(errorContainer);
  }

  errorContainer.innerHTML = `
    <div class="fatal-error-content">
      <h2>Something went wrong</h2>
      <p>${message}</p>
      <button onclick="location.reload()">Refresh Page</button>
    </div>
  `;

  errorContainer.style.display = 'flex';
}
