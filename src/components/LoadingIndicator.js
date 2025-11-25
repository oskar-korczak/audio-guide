// LoadingIndicator.js - Multi-step progress indicator for audio generation

const STEPS = {
  fetching_facts: { label: 'Finding interesting facts...', step: 1 },
  generating_script: { label: 'Writing your audio guide...', step: 2 },
  generating_audio: { label: 'Generating audio...', step: 3 }
};

let indicatorElement = null;

/**
 * Show generation progress with current step
 * @param {string} status - Current status (fetching_facts, generating_script, generating_audio)
 */
export function showGenerationProgress(status) {
  const stepInfo = STEPS[status];
  if (!stepInfo) {
    hideGenerationProgress();
    return;
  }

  if (!indicatorElement) {
    indicatorElement = document.createElement('div');
    indicatorElement.className = 'generation-progress';
    document.body.appendChild(indicatorElement);
  }

  indicatorElement.innerHTML = `
    <div class="progress-steps">
      ${Object.entries(STEPS).map(([key, info]) => `
        <div class="step ${info.step <= stepInfo.step ? 'active' : ''} ${key === status ? 'current' : ''}">
          <span class="step-number">${info.step}</span>
        </div>
      `).join('')}
    </div>
    <div class="progress-label">${stepInfo.label}</div>
    <button class="cancel-btn" onclick="window.cancelAudioGeneration?.()">Cancel</button>
  `;

  indicatorElement.style.display = 'block';
}

/**
 * Hide the generation progress indicator
 */
export function hideGenerationProgress() {
  if (indicatorElement) {
    indicatorElement.style.display = 'none';
  }
}

/**
 * Show generation error with retry option
 * @param {Error} error - Error object with status and code
 */
export function showGenerationError(error) {
  hideGenerationProgress();

  let message = 'Something went wrong. Please try again.';
  let retryable = true;

  if (error.status === 401) {
    message = 'API key is invalid. Please check your configuration.';
    retryable = false;
  } else if (error.status === 429) {
    message = 'Too many requests. Please wait a moment and try again.';
  } else if (error.code === 'insufficient_quota') {
    message = 'API quota exceeded. Please check your account.';
    retryable = false;
  }

  const errorEl = document.createElement('div');
  errorEl.className = 'generation-error';
  errorEl.innerHTML = `
    <div class="error-icon">!</div>
    <div class="error-message">${message}</div>
    ${retryable ? '<button class="retry-btn" onclick="window.retryAudioGeneration?.(); this.parentElement.remove();">Retry</button>' : ''}
    <button class="dismiss-btn" onclick="this.parentElement.remove();">Dismiss</button>
  `;

  document.body.appendChild(errorEl);
}
