---
work_package_id: "WP02"
subtasks:
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
  - "T009"
  - "T010"
title: "Core Audio Generation"
phase: "Phase 1 - MVP"
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

# Work Package Prompt: WP02 – Core Audio Generation

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Implement OpenAI integration for facts and script generation
- Implement ElevenLabs integration for text-to-speech
- Create `/generate-audio` endpoint that orchestrates the full pipeline
- Add CORS support for browser requests
- **Success**: `curl -X POST localhost:8080/generate-audio -H "Content-Type: application/json" -d '{"name":"Eiffel Tower","category":"landmark","latitude":48.8584,"longitude":2.2945}' --output test.mp3` produces valid MP3

## Context & Constraints

- **Reference**: `kitty-specs/001-backend-api-for/research.md` for exact prompts and API configurations
- **Reference**: `kitty-specs/001-backend-api-for/contracts/openapi.yaml` for API contract
- **Reference**: `kitty-specs/001-backend-api-for/data-model.md` for request/response structures

**API Keys** (environment variables):
- `OPENAI_API_KEY` - OpenAI API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key

**OpenAI Configuration**:
- Model: `gpt-4o-mini`
- Facts: 500 max tokens, temperature 0.7
- Script: 300 max tokens, temperature 0.8

**ElevenLabs Configuration**:
- Voice ID: `21m00Tcm4TlvDq8ikWAM` (Rachel)
- Model: `eleven_monolingual_v1`
- Voice settings: stability 0.5, similarity_boost 0.75, style 0.0, use_speaker_boost true

## Subtasks & Detailed Guidance

### Subtask T004 – Implement OpenAI facts generation service

- **Purpose**: Generate interesting facts about an attraction using OpenAI
- **Steps**:
  1. Create `backend/services/openai.go`
  2. Implement `GenerateFacts(ctx context.Context, attraction Attraction) (string, error)`
  3. Use direct HTTP calls to `https://api.openai.com/v1/chat/completions`
  4. Use system prompt from research.md:
     ```
     You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists.
     ```
  5. Use user prompt template from research.md:
     ```
     Provide 3-5 interesting facts about "{name}" ({category}) located at coordinates {latitude}, {longitude}. Focus on:
     - Historical significance
     - Architectural features
     - Cultural importance
     - Interesting stories or legends

     Be concise but engaging. Each fact should be 1-2 sentences.
     ```
- **Files**:
  - Create: `backend/services/openai.go`
- **Parallel?**: Yes (can be done alongside T005, T006)
- **Notes**:
  - Read API key from `os.Getenv("OPENAI_API_KEY")`
  - Return error if API key is empty
  - Parse response to extract `choices[0].message.content`

### Subtask T005 – Implement OpenAI script generation service

- **Purpose**: Convert facts into TTS-optimized narration script
- **Steps**:
  1. Add to `backend/services/openai.go`
  2. Implement `GenerateScript(ctx context.Context, attractionName string, facts string) (string, error)`
  3. Use system prompt from research.md:
     ```
     You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references like "as you can see". Use clear pronunciation-friendly language.
     ```
  4. Use user prompt template from research.md:
     ```
     Write a 30-60 second audio guide script for "{name}" based on these facts:

     {facts}

     Requirements:
     - Start with a warm welcome mentioning the attraction name
     - Share 2-3 of the most interesting facts naturally
     - Use conversational, engaging language
     - End with an invitation to explore or take photos
     - Keep it between 80-150 words for optimal audio length
     ```
- **Files**:
  - Update: `backend/services/openai.go`
- **Parallel?**: Yes (can be done alongside T004, T006)
- **Notes**:
  - Use temperature 0.8 for more creative output
  - Max tokens 300

### Subtask T006 – Implement ElevenLabs audio service

- **Purpose**: Convert script text to MP3 audio
- **Steps**:
  1. Create `backend/services/elevenlabs.go`
  2. Implement `GenerateAudio(ctx context.Context, script string) ([]byte, error)`
  3. POST to `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`
  4. Set headers:
     - `Content-Type: application/json`
     - `xi-api-key: {API_KEY}`
     - `Accept: audio/mpeg`
  5. Request body:
     ```json
     {
       "text": "{script}",
       "model_id": "eleven_monolingual_v1",
       "voice_settings": {
         "stability": 0.5,
         "similarity_boost": 0.75,
         "style": 0.0,
         "use_speaker_boost": true
       }
     }
     ```
  6. Return response body as `[]byte`
- **Files**:
  - Create: `backend/services/elevenlabs.go`
- **Parallel?**: Yes (can be done alongside T004, T005)
- **Notes**:
  - Read API key from `os.Getenv("ELEVENLABS_API_KEY")`
  - Response is raw MP3 bytes, not JSON

### Subtask T007 – Implement /generate-audio handler

- **Purpose**: Orchestrate the full pipeline and return audio
- **Steps**:
  1. Create `backend/handlers/audio.go`
  2. Implement `HandleGenerateAudio(w http.ResponseWriter, r *http.Request)`
  3. Pipeline:
     1. Parse JSON body into Attraction struct
     2. Validate request (T008)
     3. Call `GenerateFacts`
     4. Call `GenerateScript`
     5. Call `GenerateAudio`
     6. Write audio bytes with `Content-Type: audio/mpeg`
  4. Register handler in main.go
- **Files**:
  - Create: `backend/handlers/audio.go`
  - Update: `backend/main.go`
- **Parallel?**: No (depends on T004, T005, T006)
- **Notes**:
  - Only accept POST method
  - Return 400 for invalid request
  - Return 502 for upstream errors (for now, WP03 refines this)

### Subtask T008 – Add request validation

- **Purpose**: Validate incoming attraction data
- **Steps**:
  1. Create `backend/models/attraction.go` with Attraction struct
  2. Implement validation:
     - `name`: required, non-empty, max 500 chars
     - `category`: required, non-empty, max 100 chars
     - `latitude`: required, -90 to 90
     - `longitude`: required, -180 to 180
  3. Return 400 with JSON error for validation failures
- **Files**:
  - Create: `backend/models/attraction.go`
  - Update: `backend/handlers/audio.go`
- **Parallel?**: No (part of handler flow)
- **Notes**:
  - Example validation error response:
    ```json
    {"error": "Invalid request: name is required"}
    ```

### Subtask T009 – Add CORS middleware

- **Purpose**: Allow browser requests from any origin
- **Steps**:
  1. Create CORS middleware in `backend/middleware/cors.go`
  2. Set headers on all responses:
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: POST, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type`
  3. Handle OPTIONS preflight requests (return 204)
  4. Apply middleware to all routes in main.go
- **Files**:
  - Create: `backend/middleware/cors.go`
  - Update: `backend/main.go`
- **Parallel?**: No (must be integrated with main.go)
- **Notes**:
  - CORS headers must be present on error responses too

### Subtask T010 – Add /health endpoint

- **Purpose**: Health check for Cloud Run and monitoring
- **Steps**:
  1. Add handler for `GET /health`
  2. Return JSON: `{"status": "ok"}`
  3. Always return 200 OK
- **Files**:
  - Update: `backend/main.go` or create `backend/handlers/health.go`
- **Parallel?**: Yes (independent of main flow)
- **Notes**:
  - Cloud Run uses this to check container health

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API key not set | Check on startup, fail fast with clear message |
| OpenAI rate limits | Will be handled in WP03 |
| Large audio response | Stream response, don't buffer |
| Request timeout | Will be handled in WP03 |

## Definition of Done Checklist

- [ ] `backend/services/openai.go` implements GenerateFacts and GenerateScript
- [ ] `backend/services/elevenlabs.go` implements GenerateAudio
- [ ] `backend/handlers/audio.go` orchestrates the full pipeline
- [ ] `backend/models/attraction.go` defines request structure with validation
- [ ] `backend/middleware/cors.go` enables cross-origin requests
- [ ] `/health` endpoint returns `{"status": "ok"}`
- [ ] Manual test with curl produces valid MP3 audio
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify prompts match exactly those in research.md
- Verify ElevenLabs voice settings match research.md
- Verify CORS headers present on both success and error responses
- Test with real API keys (requires OPENAI_API_KEY and ELEVENLABS_API_KEY set)
- Verify generated MP3 plays in audio player

## Activity Log

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-25T22:12:07Z – claude – shell_pid= – lane=doing – Started implementation
- 2025-11-25T22:16:17Z – claude – shell_pid= – lane=for_review – Completed: Full audio generation pipeline implemented
