---
work_package_id: "WP03"
subtasks:
  - "T011"
  - "T012"
  - "T013"
  - "T014"
title: "Error Handling"
phase: "Phase 2 - Robustness"
lane: "planned"
assignee: ""
agent: ""
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

# Work Package Prompt: WP03 – Error Handling

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Map API-specific errors to user-friendly messages
- Handle rate limits, authentication errors, and timeouts gracefully
- Never expose internal details (API keys, raw error messages)
- **Success**: Simulated failures return appropriate user-friendly JSON errors

## Context & Constraints

- **Reference**: `kitty-specs/001-backend-api-for/research.md` for error mapping table
- **Reference**: `kitty-specs/001-backend-api-for/spec.md` User Story 2 for error handling requirements

**Error Mapping Table** (from research.md):
| API Error | User-Facing Message |
|-----------|---------------------|
| OpenAI 401 | "Service configuration error. Please try again later." |
| OpenAI 429 | "Service is busy. Please wait a moment and try again." |
| ElevenLabs 401 | "Service configuration error. Please try again later." |
| ElevenLabs 429 | "Audio service is busy. Please wait a moment." |
| Network timeout | "Request timed out. Please try again." |
| Unknown | "An unexpected error occurred. Please try again." |

**Timeout Requirements**:
- Total request timeout: 90 seconds (matches spec acceptance criteria)
- Individual API calls should have their own timeouts summing to less than total

## Subtasks & Detailed Guidance

### Subtask T011 – Implement error mapping utility

- **Purpose**: Centralized error-to-message conversion
- **Steps**:
  1. Create `backend/errors/errors.go`
  2. Define custom error types:
     ```go
     type APIError struct {
         StatusCode int
         Service    string // "openai" or "elevenlabs"
         RawError   error
     }
     ```
  3. Implement `ToUserMessage(err error) string` that:
     - Checks error type
     - Maps to user-friendly message based on status code and service
     - Returns generic message for unknown errors
  4. Implement `WriteErrorResponse(w http.ResponseWriter, err error)` that:
     - Sets Content-Type to application/json
     - Sets appropriate HTTP status code (400 for validation, 502 for upstream, 504 for timeout)
     - Writes JSON: `{"error": "user message"}`
- **Files**:
  - Create: `backend/errors/errors.go`
- **Parallel?**: No (foundation for T012, T013)
- **Notes**:
  - Never log or expose the raw API error message to users
  - Log raw errors server-side for debugging

### Subtask T012 – Handle OpenAI-specific errors

- **Purpose**: Map OpenAI error responses to user messages
- **Steps**:
  1. Update `backend/services/openai.go` to return APIError
  2. Handle specific status codes:
     - 401 → "Service configuration error..."
     - 429 → "Service is busy..."
     - 422 → "Content could not be processed..."
     - Other → "An unexpected error occurred..."
  3. Parse OpenAI error response body for logging:
     ```json
     {"error": {"message": "...", "code": "..."}}
     ```
- **Files**:
  - Update: `backend/services/openai.go`
- **Parallel?**: Yes (can be done alongside T013)
- **Notes**:
  - Check for `error.code == "insufficient_quota"` for billing issues

### Subtask T013 – Handle ElevenLabs-specific errors

- **Purpose**: Map ElevenLabs error responses to user messages
- **Steps**:
  1. Update `backend/services/elevenlabs.go` to return APIError
  2. Handle specific status codes:
     - 401 → "Service configuration error..."
     - 429 → "Audio service is busy..."
     - Other → "An unexpected error occurred..."
  3. Parse ElevenLabs error response:
     ```json
     {"detail": {"message": "..."}}
     ```
- **Files**:
  - Update: `backend/services/elevenlabs.go`
- **Parallel?**: Yes (can be done alongside T012)
- **Notes**:
  - ElevenLabs uses `detail` field instead of `error`

### Subtask T014 – Add request timeout handling

- **Purpose**: Prevent hanging requests from consuming resources
- **Steps**:
  1. Update handler to use `context.WithTimeout`:
     ```go
     ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
     defer cancel()
     ```
  2. Pass context to all service calls
  3. Handle `context.DeadlineExceeded` error:
     - Return 504 Gateway Timeout
     - User message: "Request timed out. Please try again."
  4. Set per-service timeouts:
     - OpenAI facts: 30s
     - OpenAI script: 30s
     - ElevenLabs audio: 30s
- **Files**:
  - Update: `backend/handlers/audio.go`
  - Update: `backend/services/openai.go`
  - Update: `backend/services/elevenlabs.go`
- **Parallel?**: No (requires service updates from T012, T013)
- **Notes**:
  - Use `http.Client` with timeout for API calls
  - Check `ctx.Err()` before each step to fail fast

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Raw errors leak to users | Review all error paths, use WriteErrorResponse everywhere |
| Timeout too short | 90s total is generous; per-service 30s is typical |
| Error type not recognized | Default to generic message for unknown errors |

## Definition of Done Checklist

- [ ] `backend/errors/errors.go` implements error mapping
- [ ] OpenAI errors return user-friendly messages
- [ ] ElevenLabs errors return user-friendly messages
- [ ] Request timeout returns 504 with appropriate message
- [ ] No raw API errors exposed in responses
- [ ] Server-side logging captures raw errors for debugging
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify all error paths use WriteErrorResponse
- Verify no API keys or raw error messages in responses
- Test timeout by simulating slow response
- Test 401/429 by using invalid/exhausted API keys
- Check server logs contain raw errors for debugging

## Activity Log

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.
