---
work_package_id: "WP05"
subtasks:
  - "T033"
  - "T034"
  - "T035"
  - "T036"
  - "T037"
  - "T038"
  - "T039"
  - "T040"
  - "T041"
  - "T042"
  - "T043"
title: "Audio Guide Generation Pipeline"
phase: "Phase 2 - User Story 2"
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "96814"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T18:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – Audio Guide Generation Pipeline

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Implement OpenAI integration for facts and script generation
- Implement ElevenLabs integration for text-to-speech
- Create orchestrated pipeline: click → facts → script → audio
- Support cancellation and multi-step progress indication

**Success**: Clicking a speaker icon triggers the full generation pipeline, completing within 20 seconds (SC-003), with visible progress states.

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - User Story 2, FR-008/009/010, SC-003
- **Research Reference**: [research.md](../../research.md) - Sections 5 (ElevenLabs) & 6 (OpenAI)
- **Contract References**:
  - [contracts/openai-api.md](../../contracts/openai-api.md) - Chat completions
  - [contracts/elevenlabs-api.md](../../contracts/elevenlabs-api.md) - Text-to-speech
- **Data Model**: [data-model.md](../../data-model.md) - AudioGuide entity, AudioGuideStatus
- **Dependencies**: WP04 (attraction selection)

**API Keys Required**:
- `VITE_OPENAI_API_KEY` - OpenAI API key
- `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key

## Subtasks & Detailed Guidance

### Subtask T033 – Create `src/services/openai.js` - OpenAI API client

- **Purpose**: Encapsulate OpenAI API communication.
- **Steps**:
  1. Create `src/services/openai.js`:
     ```javascript
     const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

     function getApiKey() {
       const key = import.meta.env.VITE_OPENAI_API_KEY;
       if (!key) {
         throw new Error('VITE_OPENAI_API_KEY not configured');
       }
       return key;
     }

     async function chatCompletion(messages, options = {}) {
       const response = await fetch(OPENAI_ENDPOINT, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${getApiKey()}`
         },
         body: JSON.stringify({
           model: 'gpt-4o-mini',
           messages,
           max_tokens: options.maxTokens || 500,
           temperature: options.temperature || 0.7
         }),
         signal: options.signal
       });

       if (!response.ok) {
         const error = await response.json().catch(() => ({}));
         const message = error.error?.message || `OpenAI API error: ${response.status}`;
         const err = new Error(message);
         err.status = response.status;
         err.code = error.error?.code;
         throw err;
       }

       const data = await response.json();
       return data.choices[0].message.content;
     }

     export { chatCompletion };
     ```
- **Files**: `src/services/openai.js`
- **Parallel?**: No - foundational service
- **Notes**: Error includes status and code for specific handling

### Subtask T034 – Implement `generateFacts(attraction)` per contracts/openai-api.md

- **Purpose**: Generate interesting facts about an attraction.
- **Steps**:
  1. Add to `src/services/openai.js`:
     ```javascript
     export async function generateFacts(attraction, signal) {
       const systemPrompt = 'You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists.';

       const userPrompt = `Provide 3-5 interesting facts about "${attraction.name}" (${attraction.category}) located at coordinates ${attraction.latitude}, ${attraction.longitude}. Focus on:
- Historical significance
- Architectural features
- Cultural importance
- Interesting stories or legends

Be concise but engaging. Each fact should be 1-2 sentences.`;

       return chatCompletion(
         [
           { role: 'system', content: systemPrompt },
           { role: 'user', content: userPrompt }
         ],
         { maxTokens: 500, temperature: 0.7, signal }
       );
     }
     ```
- **Files**: `src/services/openai.js`
- **Parallel?**: No - depends on T033
- **Notes**: Exact prompts from contracts/openai-api.md

### Subtask T035 – Implement `generateScript(attractionName, facts)` per contracts/openai-api.md

- **Purpose**: Generate TTS-optimized narration script.
- **Steps**:
  1. Add to `src/services/openai.js`:
     ```javascript
     export async function generateScript(attractionName, facts, signal) {
       const systemPrompt = 'You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references like "as you can see". Use clear pronunciation-friendly language.';

       const userPrompt = `Write a 30-60 second audio guide script for "${attractionName}" based on these facts:

${facts}

Requirements:
- Start with a warm welcome mentioning the attraction name
- Share 2-3 of the most interesting facts naturally
- Use conversational, engaging language
- End with an invitation to explore or take photos
- Keep it between 80-150 words for optimal audio length`;

       return chatCompletion(
         [
           { role: 'system', content: systemPrompt },
           { role: 'user', content: userPrompt }
         ],
         { maxTokens: 300, temperature: 0.8, signal }
       );
     }
     ```
- **Files**: `src/services/openai.js`
- **Parallel?**: No - depends on T034
- **Notes**: Higher temperature (0.8) for more creative scripts

### Subtask T036 – Create `src/services/elevenlabs.js` - ElevenLabs TTS client

- **Purpose**: Encapsulate ElevenLabs API communication.
- **Steps**:
  1. Create `src/services/elevenlabs.js`:
     ```javascript
     const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
     const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

     function getApiKey() {
       const key = import.meta.env.VITE_ELEVENLABS_API_KEY;
       if (!key) {
         throw new Error('VITE_ELEVENLABS_API_KEY not configured');
       }
       return key;
     }

     export { DEFAULT_VOICE_ID };
     ```
- **Files**: `src/services/elevenlabs.js`
- **Parallel?**: Yes - can develop alongside OpenAI work
- **Notes**: Rachel voice is clear and professional

### Subtask T037 – Implement `generateAudio(script)` returning Blob per contracts/elevenlabs-api.md

- **Purpose**: Convert script text to MP3 audio blob.
- **Steps**:
  1. Add to `src/services/elevenlabs.js`:
     ```javascript
     export async function generateAudio(script, signal) {
       const response = await fetch(
         `${ELEVENLABS_ENDPOINT}/${DEFAULT_VOICE_ID}`,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'xi-api-key': getApiKey(),
             'Accept': 'audio/mpeg'
           },
           body: JSON.stringify({
             text: script,
             model_id: 'eleven_monolingual_v1',
             voice_settings: {
               stability: 0.5,
               similarity_boost: 0.75,
               style: 0.0,
               use_speaker_boost: true
             }
           }),
           signal
         }
       );

       if (!response.ok) {
         const error = await response.json().catch(() => ({}));
         const message = error.detail?.message || error.detail || `ElevenLabs API error: ${response.status}`;
         const err = new Error(message);
         err.status = response.status;
         throw err;
       }

       return response.blob();
     }
     ```
- **Files**: `src/services/elevenlabs.js`
- **Parallel?**: Yes - parallel with OpenAI work
- **Notes**: Returns Blob directly, not base64 (iOS requirement)

### Subtask T038 – Create `src/utils/config.js` - Environment variable access helper

- **Purpose**: Centralize environment variable access with validation.
- **Steps**:
  1. Create `src/utils/config.js`:
     ```javascript
     export function getConfig() {
       return {
         openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
         elevenlabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || ''
       };
     }

     export function validateConfig() {
       const config = getConfig();
       const missing = [];

       if (!config.openaiApiKey) missing.push('VITE_OPENAI_API_KEY');
       if (!config.elevenlabsApiKey) missing.push('VITE_ELEVENLABS_API_KEY');

       if (missing.length > 0) {
         return {
           valid: false,
           missing,
           message: `Missing environment variables: ${missing.join(', ')}`
         };
       }

       return { valid: true };
     }
     ```
- **Files**: `src/utils/config.js`
- **Parallel?**: Yes - independent utility
- **Notes**: Can validate on app startup

### Subtask T039 – Create audio generation orchestrator combining all three steps

- **Purpose**: Coordinate the full generation pipeline with state management.
- **Steps**:
  1. Create `src/services/audioGuideGenerator.js`:
     ```javascript
     import { generateFacts, generateScript } from './openai.js';
     import { generateAudio } from './elevenlabs.js';

     export async function generateAudioGuide(attraction, onStatusChange, signal) {
       const result = {
         attractionId: attraction.id,
         facts: null,
         script: null,
         audioBlob: null,
         audioUrl: null,
         error: null
       };

       try {
         // Step 1: Generate facts
         onStatusChange?.('fetching_facts');
         result.facts = await generateFacts(attraction, signal);

         // Check for cancellation
         if (signal?.aborted) {
           throw new DOMException('Aborted', 'AbortError');
         }

         // Step 2: Generate script
         onStatusChange?.('generating_script');
         result.script = await generateScript(attraction.name, result.facts, signal);

         // Check for cancellation
         if (signal?.aborted) {
           throw new DOMException('Aborted', 'AbortError');
         }

         // Step 3: Generate audio
         onStatusChange?.('generating_audio');
         result.audioBlob = await generateAudio(result.script, signal);
         result.audioUrl = URL.createObjectURL(result.audioBlob);

         onStatusChange?.('ready');
         return result;

       } catch (error) {
         if (error.name === 'AbortError') {
           onStatusChange?.('idle');
           throw error;
         }

         result.error = error.message;
         onStatusChange?.('error');
         throw error;
       }
     }

     export function cleanupAudioGuide(audioGuide) {
       if (audioGuide?.audioUrl) {
         URL.revokeObjectURL(audioGuide.audioUrl);
       }
     }
     ```
- **Files**: `src/services/audioGuideGenerator.js`
- **Parallel?**: No - integration layer
- **Notes**: Orchestrates all three API calls with cancellation support

### Subtask T040 – Implement AbortController for cancellable requests

- **Purpose**: Allow users to cancel in-progress generation.
- **Steps**:
  1. Abort handling is already in T039
  2. Create controller in calling code:
     ```javascript
     // In main.js or state manager
     let currentAbortController = null;

     function startGeneration(attraction) {
       // Cancel any existing generation
       if (currentAbortController) {
         currentAbortController.abort();
       }

       currentAbortController = new AbortController();

       generateAudioGuide(
         attraction,
         (status) => updateStatus(status),
         currentAbortController.signal
       )
         .then(result => handleGenerationComplete(result))
         .catch(error => {
           if (error.name !== 'AbortError') {
             handleGenerationError(error);
           }
         });
     }

     function cancelGeneration() {
       if (currentAbortController) {
         currentAbortController.abort();
         currentAbortController = null;
       }
     }
     ```
- **Files**: `src/main.js` or state management
- **Parallel?**: No - depends on T039
- **Notes**: Selecting new attraction should auto-cancel previous

### Subtask T041 – Create `src/components/LoadingIndicator.js` with multi-step progress

- **Purpose**: Show which step of generation is in progress.
- **Steps**:
  1. Create `src/components/LoadingIndicator.js`:
     ```javascript
     const STEPS = {
       fetching_facts: { label: 'Finding interesting facts...', step: 1 },
       generating_script: { label: 'Writing your audio guide...', step: 2 },
       generating_audio: { label: 'Generating audio...', step: 3 }
     };

     let indicatorElement = null;

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

     export function hideGenerationProgress() {
       if (indicatorElement) {
         indicatorElement.style.display = 'none';
       }
     }
     ```
- **Files**: `src/components/LoadingIndicator.js`
- **Parallel?**: Yes - independent UI component
- **Notes**: Three-step progress with cancel button

### Subtask T042 – Display step-specific loading states

- **Purpose**: Style the loading indicator for clarity.
- **Steps**:
  1. Add CSS to `src/style.css`:
     ```css
     .generation-progress {
       position: fixed;
       bottom: 80px;
       left: 50%;
       transform: translateX(-50%);
       background: white;
       padding: 16px 24px;
       border-radius: 12px;
       box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
       z-index: 1000;
       text-align: center;
       min-width: 250px;
     }

     .progress-steps {
       display: flex;
       justify-content: center;
       gap: 20px;
       margin-bottom: 12px;
     }

     .step {
       width: 32px;
       height: 32px;
       border-radius: 50%;
       background: #e0e0e0;
       display: flex;
       align-items: center;
       justify-content: center;
       font-weight: bold;
       color: #999;
       transition: all 0.3s ease;
     }

     .step.active {
       background: #4285f4;
       color: white;
     }

     .step.current {
       animation: pulse 1s infinite;
     }

     @keyframes pulse {
       0%, 100% { transform: scale(1); }
       50% { transform: scale(1.1); }
     }

     .progress-label {
       color: #333;
       font-size: 14px;
       margin-bottom: 12px;
     }

     .cancel-btn {
       padding: 8px 20px;
       border: 1px solid #ddd;
       background: white;
       border-radius: 20px;
       cursor: pointer;
       font-size: 13px;
       color: #666;
     }

     .cancel-btn:hover {
       background: #f5f5f5;
     }
     ```
- **Files**: `src/style.css`
- **Parallel?**: No - part of T041
- **Notes**: Pulse animation on current step

### Subtask T043 – Handle API errors with user-friendly messages and retry button

- **Purpose**: Show clear error messages when generation fails.
- **Steps**:
  1. Create error display:
     ```javascript
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
     ```
  2. Add CSS:
     ```css
     .generation-error {
       position: fixed;
       bottom: 80px;
       left: 50%;
       transform: translateX(-50%);
       background: #fff3f3;
       border: 1px solid #ffcdd2;
       padding: 16px 24px;
       border-radius: 12px;
       box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
       z-index: 1000;
       text-align: center;
       max-width: 300px;
     }

     .error-icon {
       width: 40px;
       height: 40px;
       background: #ef5350;
       color: white;
       border-radius: 50%;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 24px;
       font-weight: bold;
       margin: 0 auto 12px;
     }

     .error-message {
       color: #c62828;
       margin-bottom: 12px;
     }

     .retry-btn {
       padding: 8px 20px;
       background: #4285f4;
       color: white;
       border: none;
       border-radius: 20px;
       cursor: pointer;
       margin-right: 8px;
     }

     .dismiss-btn {
       padding: 8px 20px;
       background: white;
       border: 1px solid #ddd;
       border-radius: 20px;
       cursor: pointer;
     }
     ```
- **Files**: `src/components/LoadingIndicator.js`, `src/style.css`
- **Parallel?**: No - depends on error handling setup
- **Notes**: Different handling for auth vs rate limit vs quota errors

## Integration: Connect to attraction clicks

Update attraction click handler in main.js:
```javascript
import { generateAudioGuide, cleanupAudioGuide } from './services/audioGuideGenerator.js';
import { showGenerationProgress, hideGenerationProgress, showGenerationError } from './components/LoadingIndicator.js';

let currentAbortController = null;
let currentAudioGuide = null;
let lastSelectedAttraction = null;

// Expose for cancel button
window.cancelAudioGeneration = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    hideGenerationProgress();
  }
};

window.retryAudioGeneration = () => {
  if (lastSelectedAttraction) {
    handleAttractionClick(lastSelectedAttraction);
  }
};

async function handleAttractionClick(attraction) {
  // Cancel any existing generation
  if (currentAbortController) {
    currentAbortController.abort();
  }

  // Cleanup previous audio
  if (currentAudioGuide) {
    cleanupAudioGuide(currentAudioGuide);
  }

  lastSelectedAttraction = attraction;
  currentAbortController = new AbortController();

  try {
    currentAudioGuide = await generateAudioGuide(
      attraction,
      (status) => showGenerationProgress(status),
      currentAbortController.signal
    );

    hideGenerationProgress();
    // Show audio player (WP06)
    console.log('Audio ready:', currentAudioGuide.audioUrl);

  } catch (error) {
    if (error.name !== 'AbortError') {
      showGenerationError(error);
    }
  }
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Generation >20s target | Show progress, allow cancel |
| API quota exceeded | Clear error message, no retry |
| Invalid API keys | Validate on startup |
| Network timeout | AbortController with timeout |

## Definition of Done Checklist

- [ ] Clicking attraction starts fact generation
- [ ] Progress indicator shows current step (1/2/3)
- [ ] Each step transitions visibly
- [ ] Generation completes within 20 seconds (SC-003)
- [ ] Cancel button stops generation
- [ ] Error messages are user-friendly
- [ ] Retry button works for retryable errors
- [ ] Audio blob URL is created successfully
- [ ] Previous audio cleaned up on new selection

## Review Guidance

- Test with valid API keys in .env
- Verify all three steps show in progress indicator
- Test cancel mid-generation
- Test error handling by using invalid API key temporarily
- Confirm console shows audio URL when complete

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-11-25T19:20:00Z – claude – shell_pid=96814 – lane=doing – Started implementation
- 2025-11-25T19:30:00Z – claude – shell_pid=96814 – lane=for_review – Completed: openai.js, elevenlabs.js, audioGuideGenerator.js, LoadingIndicator.js, config.js, CSS styles, main.js integration
