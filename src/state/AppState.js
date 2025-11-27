// AppState.js - Global application state management

// Application state following data-model.md
const state = {
  userLocation: null,
  locationPermission: 'prompt', // prompt | granted | denied | unavailable
  compassPermission: 'prompt',
  viewport: null,
  attractions: [],
  selectedAttractionId: null,
  currentAudioGuide: null,
  audioStatus: 'idle', // idle | fetching_facts | generating_script | generating_audio | ready | playing | paused | error
  isLoadingAttractions: false,
  error: null,
  selectedLanguage: localStorage.getItem('audioGuideLanguage') || 'English'
};

const listeners = new Set();

/**
 * Get a copy of the current state
 * @returns {Object} Current state
 */
export function getState() {
  return { ...state };
}

/**
 * Update state with partial updates
 * @param {Object} updates - Partial state updates
 */
export function setState(updates) {
  Object.assign(state, updates);
  notifyListeners();
}

/**
 * Subscribe to state changes
 * @param {Function} listener - Called with new state on changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  const currentState = getState();
  listeners.forEach(listener => listener(currentState));
}

// Valid status transitions
const VALID_TRANSITIONS = {
  idle: ['fetching_facts'],
  fetching_facts: ['generating_script', 'error', 'idle'],
  generating_script: ['generating_audio', 'error', 'idle'],
  generating_audio: ['ready', 'error', 'idle'],
  ready: ['playing', 'idle'],
  playing: ['paused', 'ready', 'idle'],
  paused: ['playing', 'ready', 'idle'],
  error: ['idle', 'fetching_facts']
};

/**
 * Set audio status with transition validation
 * @param {string} newStatus - New status
 */
export function setAudioStatus(newStatus) {
  const currentStatus = state.audioStatus;

  if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    console.warn(`Invalid status transition: ${currentStatus} -> ${newStatus}`);
    // Allow anyway for flexibility, but log warning
  }

  setState({ audioStatus: newStatus });
}

/**
 * Reset audio state to idle
 */
export function resetAudioState() {
  setState({
    currentAudioGuide: null,
    audioStatus: 'idle',
    error: null
  });
}

/**
 * Get the currently selected attraction
 * @returns {Object|null} Selected attraction or null
 */
export function getSelectedAttraction() {
  if (!state.selectedAttractionId) return null;
  return state.attractions.find(a => a.id === state.selectedAttractionId);
}

/**
 * Check if generation is in progress
 * @returns {boolean}
 */
export function isGenerating() {
  return ['fetching_facts', 'generating_script', 'generating_audio'].includes(state.audioStatus);
}

/**
 * Check if audio is ready for playback
 * @returns {boolean}
 */
export function isAudioReady() {
  return ['ready', 'playing', 'paused'].includes(state.audioStatus);
}

/**
 * Set the selected language and persist to localStorage
 * @param {string} language - Language name (e.g., "English", "Polski", "Spanish")
 */
export function setSelectedLanguage(language) {
  localStorage.setItem('audioGuideLanguage', language);
  setState({ selectedLanguage: language });
}

/**
 * Get the currently selected language
 * @returns {string} Selected language
 */
export function getSelectedLanguage() {
  return state.selectedLanguage;
}
