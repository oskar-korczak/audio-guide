---
work_package_id: "WP08"
subtasks:
  - "T059"
  - "T060"
  - "T061"
  - "T062"
  - "T063"
  - "T064"
  - "T065"
  - "T066"
  - "T067"
title: "Error Handling & Edge Cases"
phase: "Phase 3 - Polish"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T18:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP08 – Error Handling & Edge Cases

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Implement comprehensive error handling for all failure modes
- Provide user-friendly error messages with appropriate retry options
- Ensure partial failures don't break other features
- Handle all edge cases from spec.md

**Success**: App gracefully handles network errors, permission denial, API failures, and timeouts with clear user feedback. Users can always continue using working features.

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - Edge Cases section, FR-017/019
- **Research Reference**: [research.md](../../research.md) - Rate limiting, API errors
- **Dependencies**: WP03, WP04, WP05, WP06

**Key Principle**: Users should never see a broken app state. Every error should provide:
1. Clear explanation of what went wrong
2. Action they can take (retry, dismiss, alternative)
3. Ability to continue using other features

## Subtasks & Detailed Guidance

### Subtask T059 – Implement error boundary for uncaught exceptions

- **Purpose**: Catch unexpected errors and show recovery UI.
- **Steps**:
  1. Create `src/utils/errorBoundary.js`:
     ```javascript
     let errorContainer = null;

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
     ```
  2. Add CSS:
     ```css
     .fatal-error {
       position: fixed;
       top: 0;
       left: 0;
       right: 0;
       bottom: 0;
       background: rgba(0, 0, 0, 0.8);
       display: flex;
       align-items: center;
       justify-content: center;
       z-index: 10000;
     }

     .fatal-error-content {
       background: white;
       padding: 32px;
       border-radius: 16px;
       text-align: center;
       max-width: 400px;
     }

     .fatal-error h2 {
       margin: 0 0 16px;
       color: #c62828;
     }

     .fatal-error button {
       margin-top: 16px;
       padding: 12px 24px;
       background: #4285f4;
       color: white;
       border: none;
       border-radius: 8px;
       font-size: 16px;
       cursor: pointer;
     }
     ```
- **Files**: `src/utils/errorBoundary.js`, `src/style.css`
- **Parallel?**: No - foundational error handling
- **Notes**: Only for truly fatal errors; most errors handled locally

### Subtask T060 – Add network connectivity detection

- **Purpose**: Detect and communicate network issues.
- **Steps**:
  1. Create `src/utils/network.js`:
     ```javascript
     let isOnline = navigator.onLine;
     const listeners = new Set();

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

     export function getNetworkStatus() {
       return isOnline;
     }

     export function onNetworkChange(callback) {
       listeners.add(callback);
       return () => listeners.delete(callback);
     }

     function notifyListeners(online) {
       listeners.forEach(cb => cb(online));
     }

     let offlineMessage = null;

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

     function hideOfflineMessage() {
       if (offlineMessage) {
         offlineMessage.style.display = 'none';
       }
     }
     ```
  2. Add CSS:
     ```css
     .offline-message {
       position: fixed;
       top: 0;
       left: 0;
       right: 0;
       background: #ffc107;
       color: #333;
       padding: 8px 16px;
       text-align: center;
       z-index: 2000;
       font-size: 14px;
     }
     ```
- **Files**: `src/utils/network.js`, `src/style.css`
- **Parallel?**: Yes - independent utility
- **Notes**: Banner at top when offline

### Subtask T061 – Display timeout warnings after 30 seconds

- **Purpose**: Inform user when operations take too long.
- **Steps**:
  1. Create timeout warning utility:
     ```javascript
     // In LoadingIndicator.js or separate file
     let timeoutWarningTimer = null;

     export function startTimeoutWarning(onTimeout, timeoutMs = 30000) {
       clearTimeoutWarning();

       timeoutWarningTimer = setTimeout(() => {
         onTimeout();
       }, timeoutMs);
     }

     export function clearTimeoutWarning() {
       if (timeoutWarningTimer) {
         clearTimeout(timeoutWarningTimer);
         timeoutWarningTimer = null;
       }
     }

     export function showTimeoutWarning() {
       const warning = document.createElement('div');
       warning.className = 'timeout-warning';
       warning.innerHTML = `
         <span>This is taking longer than expected...</span>
         <button onclick="this.parentElement.remove()">Dismiss</button>
       `;
       document.body.appendChild(warning);

       // Auto-dismiss after 10 seconds
       setTimeout(() => warning.remove(), 10000);
     }
     ```
  2. Add CSS:
     ```css
     .timeout-warning {
       position: fixed;
       top: 60px;
       left: 50%;
       transform: translateX(-50%);
       background: #fff3e0;
       border: 1px solid #ffcc80;
       padding: 12px 20px;
       border-radius: 8px;
       display: flex;
       align-items: center;
       gap: 12px;
       z-index: 1001;
     }

     .timeout-warning button {
       padding: 4px 12px;
       background: white;
       border: 1px solid #ddd;
       border-radius: 4px;
       cursor: pointer;
     }
     ```
  3. Integrate with generation:
     ```javascript
     // Start warning when generation begins
     startTimeoutWarning(showTimeoutWarning, 30000);

     // Clear when generation completes or errors
     clearTimeoutWarning();
     ```
- **Files**: `src/components/LoadingIndicator.js`, `src/style.css`
- **Parallel?**: Yes - independent enhancement
- **Notes**: 30 second threshold per spec edge cases

### Subtask T062 – Create reusable error message component

- **Purpose**: Consistent error display across the app.
- **Steps**:
  1. Create `src/components/ErrorMessage.js`:
     ```javascript
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
           <button class="dismiss-btn">×</button>
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
         setTimeout(() => errorEl.remove(), autoHide);
       }

       return {
         dismiss: () => errorEl.remove()
       };
     }
     ```
  2. Add CSS:
     ```css
     .error-toast {
       position: fixed;
       bottom: 100px;
       left: 20px;
       right: 20px;
       background: white;
       border-left: 4px solid #ef5350;
       border-radius: 8px;
       box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
       padding: 12px 16px;
       display: flex;
       align-items: center;
       gap: 12px;
       z-index: 1500;
       animation: slideUp 0.3s ease;
     }

     @keyframes slideUp {
       from {
         transform: translateY(20px);
         opacity: 0;
       }
       to {
         transform: translateY(0);
         opacity: 1;
       }
     }

     .error-toast-icon {
       width: 32px;
       height: 32px;
       background: #ef5350;
       color: white;
       border-radius: 50%;
       display: flex;
       align-items: center;
       justify-content: center;
       font-weight: bold;
       flex-shrink: 0;
     }

     .error-toast-content {
       flex: 1;
     }

     .error-toast-title {
       font-weight: 600;
       color: #333;
     }

     .error-toast-message {
       font-size: 13px;
       color: #666;
       margin-top: 2px;
     }

     .error-toast-actions {
       display: flex;
       gap: 8px;
     }

     .error-toast .retry-btn {
       padding: 6px 16px;
       background: #4285f4;
       color: white;
       border: none;
       border-radius: 4px;
       cursor: pointer;
     }

     .error-toast .dismiss-btn {
       width: 28px;
       height: 28px;
       background: none;
       border: none;
       font-size: 20px;
       color: #999;
       cursor: pointer;
     }
     ```
- **Files**: `src/components/ErrorMessage.js`, `src/style.css`
- **Parallel?**: Yes - reusable component
- **Notes**: Supports retry, dismiss, and auto-hide

### Subtask T063 – Handle geolocation permission denial (manual navigation mode)

- **Purpose**: Allow full app use without location.
- **Steps**:
  1. Update location handling:
     ```javascript
     // In geolocation service or main.js
     function handleLocationDenied() {
       showError({
         title: 'Location Unavailable',
         message: 'Location access was denied. You can still explore the map and generate audio guides manually.',
         autoHide: 5000
       });

       // Enable manual mode - map still works
       // User can pan to find attractions
     }
     ```
  2. Ensure all features work without location:
     - Map displays (check) - default center
     - Attractions load (check) - based on viewport
     - Audio generation (check) - not location dependent
     - Only user marker is missing
- **Files**: Integration in main.js
- **Parallel?**: Yes - independent handling
- **Notes**: App should be fully functional without location

### Subtask T064 – Handle Overpass API errors (429, 504) with retry UI

- **Purpose**: Graceful handling of attraction loading failures.
- **Steps**:
  1. Add specific error handling:
     ```javascript
     // In attractionsManager.js or main.js
     function handleOverpassError(error) {
       let title = 'Failed to Load Attractions';
       let message = 'Unable to find nearby attractions. Please try again.';
       let retryable = true;

       if (error.message === 'RATE_LIMITED') {
         message = 'Too many requests. Please wait a moment and try again.';
       } else if (error.message === 'TIMEOUT') {
         message = 'The request took too long. Try zooming in for a smaller area.';
       }

       showError({
         title,
         message,
         retryable,
         onRetry: () => {
           // Trigger reload
           const viewport = getViewport();
           if (viewport) {
             handleViewportChange(viewport);
           }
         }
       });
     }
     ```
- **Files**: `src/services/attractionsManager.js` or main.js
- **Parallel?**: Yes - specific API handling
- **Notes**: Suggest zooming in on timeout

### Subtask T065 – Handle OpenAI API errors (401, 429, quota) with clear messages

- **Purpose**: Clear communication of API key and quota issues.
- **Steps**:
  1. Add OpenAI-specific error handling:
     ```javascript
     function handleOpenAIError(error) {
       let title = 'Content Generation Failed';
       let message = 'Unable to generate audio guide content.';
       let retryable = true;

       if (error.status === 401) {
         title = 'Invalid API Key';
         message = 'The OpenAI API key is invalid. Please check your configuration.';
         retryable = false;
       } else if (error.status === 429) {
         message = 'Rate limit reached. Please wait a moment and try again.';
       } else if (error.code === 'insufficient_quota') {
         title = 'API Quota Exceeded';
         message = 'Your OpenAI account has run out of credits. Please check your billing.';
         retryable = false;
       }

       showError({ title, message, retryable, onRetry: () => retryLastAttraction() });
     }
     ```
- **Files**: `src/services/audioGuideGenerator.js` or integration
- **Parallel?**: Yes - specific API handling
- **Notes**: Non-retryable for auth/quota issues

### Subtask T066 – Handle ElevenLabs API errors (401, 429, quota) with clear messages

- **Purpose**: Clear communication of TTS API issues.
- **Steps**:
  1. Add ElevenLabs-specific error handling:
     ```javascript
     function handleElevenLabsError(error) {
       let title = 'Audio Generation Failed';
       let message = 'Unable to generate audio narration.';
       let retryable = true;

       if (error.status === 401) {
         title = 'Invalid API Key';
         message = 'The ElevenLabs API key is invalid. Please check your configuration.';
         retryable = false;
       } else if (error.status === 429) {
         title = 'Character Limit Reached';
         message = 'Your ElevenLabs character quota has been exceeded. Please check your account.';
         retryable = false;
       } else if (error.status === 422) {
         message = 'The generated script could not be processed. Please try a different attraction.';
       }

       showError({ title, message, retryable, onRetry: () => retryLastAttraction() });
     }
     ```
- **Files**: `src/services/audioGuideGenerator.js` or integration
- **Parallel?**: Yes - specific API handling
- **Notes**: ElevenLabs 429 usually means quota (not rate limit)

### Subtask T067 – Ensure partial failures don't break other features

- **Purpose**: Isolation between features.
- **Steps**:
  1. Review all error handlers to ensure they don't affect unrelated features:
     ```javascript
     // Example: location failure shouldn't affect attractions
     try {
       await initLocation();
     } catch (error) {
       console.warn('Location initialization failed:', error);
       // Don't throw - continue with other features
     }

     // Attractions should load regardless of location status
     onViewportChange(handleViewportChange);

     // Example: audio generation failure shouldn't affect map
     try {
       await selectAttraction(attraction);
     } catch (error) {
       handleGenerationError(error);
       // Map still works, user can try another attraction
     }
     ```
  2. Add try-catch around all initialization:
     ```javascript
     async function initApp() {
       // Each init is independent
       initErrorBoundary();
       initNetworkDetection();

       const map = initMap('map');
       addTileLayer(map);

       // Location is optional
       try {
         await initLocation();
       } catch (e) {
         console.warn('Location unavailable:', e);
       }

       // Attractions work regardless
       onViewportChange(handleViewportChange);

       // Trigger initial load
       handleViewportChange(getViewport());
     }
     ```
- **Files**: `src/main.js`
- **Parallel?**: No - integration review
- **Notes**: Each feature should fail independently

## Integration Checklist

After completing all subtasks, verify:
```javascript
// In main.js initialization
import { initErrorBoundary } from './utils/errorBoundary.js';
import { initNetworkDetection } from './utils/network.js';

// Initialize error handling first
initErrorBoundary();
initNetworkDetection();

// Then rest of app...
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Error handling hides real bugs | Log all errors to console |
| Too many error messages | Deduplicate, rate limit |
| User confusion | Clear, actionable messages |
| Feature interdependency | Strict try-catch isolation |

## Definition of Done Checklist

- [ ] Global error boundary catches uncaught exceptions
- [ ] Offline banner shows when network lost
- [ ] Timeout warning after 30 seconds
- [ ] Error toasts show for all API failures
- [ ] Location denial shows message but app works
- [ ] Overpass errors show retry option
- [ ] OpenAI errors show appropriate message (auth vs quota vs rate)
- [ ] ElevenLabs errors show appropriate message
- [ ] One feature failing doesn't break others
- [ ] User can always dismiss errors and continue

## Review Guidance

- Test each error scenario manually
- Verify errors don't prevent using other features
- Check error messages are helpful and actionable
- Confirm retry buttons actually retry
- Test offline mode (disable network in DevTools)

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
