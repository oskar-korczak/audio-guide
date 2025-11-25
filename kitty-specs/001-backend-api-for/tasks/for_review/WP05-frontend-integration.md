---
work_package_id: "WP05"
subtasks:
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
title: "Frontend Integration"
phase: "Phase 4 - Integration"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – Frontend Integration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Create new API client to call backend instead of direct API calls
- Update audio generation flow to use single backend endpoint
- Remove exposed API keys from frontend code
- **Success**: Browser dev tools show NO API keys; audio plays correctly via backend

## Context & Constraints

- **Reference**: `kitty-specs/001-backend-api-for/spec.md` FR-010, FR-011 for frontend requirements
- **Reference**: `kitty-specs/001-backend-api-for/quickstart.md` for frontend integration code

**Current Frontend Files** (from main branch or worktree `001-interactive-audio-tour`):
- `src/services/openai.js` - Direct OpenAI calls (TO BE REMOVED)
- `src/services/elevenlabs.js` - Direct ElevenLabs calls (TO BE REMOVED)
- `src/services/audioGuideGenerator.js` - Orchestrates generation (TO BE UPDATED)

**Environment Variables**:
- Remove: `VITE_OPENAI_API_KEY`, `VITE_ELEVENLABS_API_KEY`
- Add: `VITE_BACKEND_URL` (Cloud Run URL from WP04)

**Important**: Frontend source files are in the main project, not in this worktree. You may need to copy them or work in the appropriate location.

## Subtasks & Detailed Guidance

### Subtask T018 – Create audioApi.js service

- **Purpose**: Single API client for backend communication
- **Steps**:
  1. Create `src/services/audioApi.js`
  2. Implement:
     ```javascript
     const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

     /**
      * Generate audio guide from attraction data
      * @param {Object} attraction - Attraction with name, category, latitude, longitude
      * @param {AbortSignal} signal - AbortController signal for cancellation
      * @returns {Promise<Blob>} MP3 audio blob
      */
     export async function generateAudioGuide(attraction, signal) {
       const response = await fetch(`${BACKEND_URL}/generate-audio`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           name: attraction.name,
           category: attraction.category,
           latitude: attraction.latitude,
           longitude: attraction.longitude
         }),
         signal
       });

       if (!response.ok) {
         const error = await response.json().catch(() => ({ error: 'Unknown error' }));
         throw new Error(error.error || `Backend error: ${response.status}`);
       }

       return response.blob();
     }
     ```
- **Files**:
  - Create: `src/services/audioApi.js`
- **Parallel?**: No (foundation for T019)
- **Notes**:
  - Fallback to localhost for local development
  - Preserve AbortSignal support for cancellation

### Subtask T019 – Update audioGuideGenerator.js

- **Purpose**: Use backend API instead of three separate steps
- **Steps**:
  1. Open `src/services/audioGuideGenerator.js`
  2. Replace imports:
     ```javascript
     // REMOVE these imports:
     // import { generateFacts, generateScript } from './openai.js';
     // import { generateAudio } from './elevenlabs.js';

     // ADD this import:
     import { generateAudioGuide } from './audioApi.js';
     ```
  3. Simplify the generation function:
     ```javascript
     export async function generateAudioGuide(attraction, statusCallback, signal) {
       try {
         statusCallback?.('generating');

         const audioBlob = await generateAudioGuide(attraction, signal);
         const audioUrl = URL.createObjectURL(audioBlob);

         return {
           attractionId: attraction.id,
           attractionName: attraction.name,
           audioBlob,
           audioUrl,
           error: null
         };
       } catch (error) {
         if (error.name === 'AbortError') {
           return { error: 'cancelled' };
         }
         return {
           attractionId: attraction.id,
           attractionName: attraction.name,
           error: error.message
         };
       }
     }
     ```
  4. Remove intermediate status updates (fetching_facts, generating_script, generating_audio) since backend handles all steps
- **Files**:
  - Update: `src/services/audioGuideGenerator.js`
- **Parallel?**: No (depends on T018)
- **Notes**:
  - Simplify status to just 'generating' → 'ready' or 'error'
  - Consider updating status display in UI if time permits
  - Preserve return shape for compatibility with existing code

### Subtask T020 – Remove VITE_OPENAI_API_KEY

- **Purpose**: Eliminate exposed OpenAI API key
- **Steps**:
  1. Remove from `.env`:
     ```
     # DELETE THIS LINE:
     VITE_OPENAI_API_KEY=sk-...
     ```
  2. Remove from `.env.example` if it exists
  3. Search codebase for any other references:
     ```bash
     grep -r "VITE_OPENAI_API_KEY" src/
     ```
  4. Delete `src/services/openai.js` entirely (no longer needed)
- **Files**:
  - Update: `.env`
  - Update: `.env.example` (if exists)
  - Delete: `src/services/openai.js`
- **Parallel?**: Yes (can be done alongside T021, T022)
- **Notes**:
  - Verify no other files import from openai.js before deleting

### Subtask T021 – Remove VITE_ELEVENLABS_API_KEY

- **Purpose**: Eliminate exposed ElevenLabs API key
- **Steps**:
  1. Remove from `.env`:
     ```
     # DELETE THIS LINE:
     VITE_ELEVENLABS_API_KEY=...
     ```
  2. Remove from `.env.example` if it exists
  3. Search codebase for any other references:
     ```bash
     grep -r "VITE_ELEVENLABS_API_KEY" src/
     ```
  4. Delete `src/services/elevenlabs.js` entirely (no longer needed)
- **Files**:
  - Update: `.env`
  - Update: `.env.example` (if exists)
  - Delete: `src/services/elevenlabs.js`
- **Parallel?**: Yes (can be done alongside T020, T022)
- **Notes**:
  - Verify no other files import from elevenlabs.js before deleting

### Subtask T022 – Add VITE_BACKEND_URL configuration

- **Purpose**: Configure backend endpoint URL
- **Steps**:
  1. Add to `.env`:
     ```
     VITE_BACKEND_URL=https://audio-guide-api-xxx-uc.a.run.app
     ```
     (Replace xxx with actual Cloud Run URL from WP04)
  2. Add to `.env.example`:
     ```
     VITE_BACKEND_URL=http://localhost:8080
     ```
  3. Document in README or quickstart if needed
- **Files**:
  - Update: `.env`
  - Update: `.env.example` (if exists)
- **Parallel?**: Yes (can be done alongside T020, T021)
- **Notes**:
  - Use localhost for local development
  - Production URL comes from WP04 deployment

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing flow | Keep return shape compatible |
| API keys cached in browser | Clear browser cache; use incognito for testing |
| CORS errors | Verified in WP02; check browser console |
| Old code still references removed files | Search for imports before deleting |

## Definition of Done Checklist

- [ ] `src/services/audioApi.js` created
- [ ] `src/services/audioGuideGenerator.js` updated to use backend
- [ ] `src/services/openai.js` deleted
- [ ] `src/services/elevenlabs.js` deleted
- [ ] `VITE_OPENAI_API_KEY` removed from .env
- [ ] `VITE_ELEVENLABS_API_KEY` removed from .env
- [ ] `VITE_BACKEND_URL` added to .env
- [ ] No API keys visible in browser dev tools (Network tab)
- [ ] No API keys in page source
- [ ] Audio plays correctly via backend
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Open browser dev tools → Network tab
- Trigger audio generation
- Verify only request is to `/generate-audio` on backend URL
- Verify no `api.openai.com` or `api.elevenlabs.io` requests
- View page source, search for "api key" - should find nothing
- Check localStorage and sessionStorage for any cached keys
- Play generated audio to confirm quality matches previous

## Activity Log

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-25T22:22:49Z – claude – shell_pid= – lane=doing – Started implementation
- 2025-11-25T22:23:58Z – claude – shell_pid= – lane=for_review – Completed: audioApi.js, updated audioGuideGenerator.js, .env.example
