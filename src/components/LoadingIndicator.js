// LoadingIndicator.js - Progress bar indicator for audio generation

const TOTAL_DURATION = 22000; // 22 seconds total

const STAGES = [
  { at: 0, label: 'Researching...' },
  { at: 0.25, label: 'Generating script...' },
  { at: 0.55, label: 'Synthesizing voice...' },
  { at: 0.85, label: 'Finalizing...' }
];

let indicatorElement = null;
let animationFrame = null;
let startTime = null;

/**
 * Get the current stage label based on progress
 */
function getStageLabel(progress) {
  let label = STAGES[0].label;
  for (const stage of STAGES) {
    if (progress >= stage.at) {
      label = stage.label;
    }
  }
  return label;
}

/**
 * Update the progress bar animation
 */
function updateProgress() {
  if (!indicatorElement || !startTime) return;

  const elapsed = Date.now() - startTime;
  const progress = Math.min(elapsed / TOTAL_DURATION, 0.95); // Cap at 95% until done

  const progressBar = indicatorElement.querySelector('.progress-fill');
  const labelEl = indicatorElement.querySelector('.progress-label');

  if (progressBar) {
    progressBar.style.width = `${progress * 100}%`;
  }
  if (labelEl) {
    labelEl.textContent = getStageLabel(progress);
  }

  if (progress < 0.95) {
    animationFrame = requestAnimationFrame(updateProgress);
  }
}

/**
 * Show generation progress with animated progress bar
 */
export function showGenerationProgress() {
  if (!indicatorElement) {
    indicatorElement = document.createElement('div');
    indicatorElement.className = 'generation-progress';
    document.body.appendChild(indicatorElement);
  }

  indicatorElement.innerHTML = `
    <div class="progress-bar-container">
      <div class="progress-fill"></div>
    </div>
    <div class="progress-label">${STAGES[0].label}</div>
    <button class="cancel-btn" onclick="window.cancelAudioGeneration?.()">Cancel</button>
  `;

  indicatorElement.style.display = 'block';
  startTime = Date.now();
  updateProgress();
}

/**
 * Hide the generation progress indicator
 */
export function hideGenerationProgress() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  startTime = null;
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
