# Feature Specification: Backend API for Audio Generation

**Feature Branch**: `001-backend-api-for`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Create a backend API with a single endpoint that accepts attraction data and returns generated audio. Move OpenAI and ElevenLabs calls to backend to secure API keys. Deploy to free-tier hosting."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Audio for Attraction (Priority: P1)

A user viewing the map taps on an attraction marker. The frontend sends the attraction details to the backend API, which researches the attraction, generates a narration script, converts it to audio, and returns the audio file. The user hears the audio guide without any API keys being exposed in their browser.

**Why this priority**: This is the core functionality - without it, the feature has no value. It directly addresses the security concern (hiding API keys) while maintaining the existing user experience.

**Independent Test**: Can be fully tested by sending a POST request with attraction data and verifying an audio file is returned. Delivers complete value as a standalone audio generation service.

**Acceptance Scenarios**:

1. **Given** a valid attraction with name, category, and coordinates, **When** the frontend sends a request to the audio generation endpoint, **Then** the backend returns an audio file within 60 seconds
2. **Given** a valid attraction request, **When** the backend processes it, **Then** no API keys are visible in browser network requests or frontend code
3. **Given** the backend is processing a request, **When** any step fails (research, script, or audio), **Then** a clear error message is returned to the frontend

---

### User Story 2 - Handle Generation Errors Gracefully (Priority: P2)

When OpenAI or ElevenLabs services are unavailable or return errors, the backend returns meaningful error information so the frontend can display appropriate messages to the user.

**Why this priority**: Error handling is essential for a good user experience but secondary to the core generation flow working correctly.

**Independent Test**: Can be tested by simulating API failures and verifying appropriate error responses are returned.

**Acceptance Scenarios**:

1. **Given** OpenAI returns a rate limit error, **When** the backend receives this error, **Then** it returns a user-friendly error indicating temporary unavailability
2. **Given** ElevenLabs returns an invalid API key error, **When** the backend receives this error, **Then** it returns a generic service error (not exposing internal details)
3. **Given** a network timeout occurs during audio generation, **When** the request times out, **Then** the backend returns an error within a reasonable time (not hanging indefinitely)

---

### User Story 3 - Deploy Backend to Free Hosting (Priority: P3)

The backend is deployed to a free-tier hosting platform, accessible via HTTPS, and can be called from the frontend application.

**Why this priority**: Deployment is necessary for production use but can be done after the API logic is working locally.

**Independent Test**: Can be tested by accessing the deployed URL and verifying it responds to health checks and processes requests.

**Acceptance Scenarios**:

1. **Given** the backend is deployed, **When** the frontend sends a request to the production URL, **Then** the request is processed successfully
2. **Given** the backend uses environment variables for API keys, **When** deployed to the hosting platform, **Then** keys are configured securely (not in code or public config)
3. **Given** a cold start scenario (serverless), **When** the first request arrives after idle period, **Then** the total response time remains under 90 seconds

---

### Edge Cases

- What happens when attraction name contains special characters or non-English text?
- How does the system handle very long attraction names or unusual categories?
- What happens if the user cancels the request mid-generation (frontend aborts)?
- How does the system behave when rate limits are hit on OpenAI or ElevenLabs?
- What happens if the generated script is empty or malformed?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept attraction data (name, category, latitude, longitude) as input
- **FR-002**: System MUST call OpenAI to generate 3-5 facts about the attraction
- **FR-003**: System MUST call OpenAI to convert facts into a TTS-optimized narration script (80-150 words)
- **FR-004**: System MUST call ElevenLabs to convert the script into audio
- **FR-005**: System MUST return the generated audio directly in the response body
- **FR-006**: System MUST store API keys securely on the server (not exposed to clients)
- **FR-007**: System MUST return appropriate error messages when generation fails
- **FR-008**: System MUST support CORS to allow frontend requests from the web application
- **FR-009**: System MUST be deployable to a free-tier hosting platform
- **FR-010**: Frontend MUST be updated to call the backend endpoint instead of direct API calls
- **FR-011**: Frontend MUST remove exposed API keys from client-side code

### Key Entities

- **Attraction**: Represents a point of interest with name (string), category (string), latitude (number), longitude (number)
- **AudioGuideRequest**: The input payload containing attraction data sent to the backend
- **AudioGuideResponse**: The output containing either the audio binary data or an error message

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate audio guides with the same functionality as before (no feature regression)
- **SC-002**: No API keys are visible in browser developer tools (network tab, source code, or local storage)
- **SC-003**: Audio generation completes within 60 seconds for 95% of requests
- **SC-004**: Backend operates within free-tier limits of the chosen hosting platform
- **SC-005**: System returns meaningful error messages that can be displayed to users (not raw API errors or stack traces)

## Assumptions

- The existing OpenAI prompts and ElevenLabs voice settings will be reused as-is
- The hosting platform will support the required runtime for the backend
- Free-tier cold starts are acceptable (user can wait up to 90 seconds on first request)
- No authentication is required for the API endpoint (public access, same as current frontend)
- Audio files are not cached on the backend (generated fresh each time)

## Deployment Recommendations

Simpler/cheaper alternatives to GCP (all have free tiers):

1. **Railway** - Simple deployment, generous free tier, automatic HTTPS
2. **Render** - Free tier with 750 hours/month, easy setup
3. **Fly.io** - Free tier available, good for serverless functions
4. **Vercel** (if using serverless functions) - Great free tier, but may have timeout limits
5. **Deno Deploy** - Free tier, good for lightweight APIs

Recommendation: **Railway** or **Render** for simplicity and reliability on free tier.
